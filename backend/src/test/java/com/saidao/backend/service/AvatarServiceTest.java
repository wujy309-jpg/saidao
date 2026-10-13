package com.saidao.backend.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;

import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 头像落盘的单测：不启动 Spring 容器，直接验证「图片被规范化成 256×256 PNG」这件事。
 *
 * <p>这里守的是最容易悄悄坏掉的一环：上传接口对了、URL 对了，但落盘的其实还是原图，
 * 于是每换一次头像就多出几 MB 的垃圾文件。
 */
class AvatarServiceTest {

    @org.junit.jupiter.api.io.TempDir
    Path tempDir;

    private AvatarService newService() {
        AvatarService service = new AvatarService();
        ReflectionTestUtils.setField(service, "uploadDir", tempDir.toString());
        return service;
    }

    /** 造一张指定尺寸的 PNG */
    private MockMultipartFile png(String filename, int width, int height) throws IOException {
        BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = image.createGraphics();
        g.setColor(Color.decode("#059669"));
        g.fillRect(0, 0, width, height);
        g.dispose();

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(image, "png", out);
        return new MockMultipartFile("file", filename, "image/png", out.toByteArray());
    }

    @Test
    @DisplayName("非正方形图片被居中裁成 256×256 的 PNG")
    void storesSquarePng() throws IOException {
        AvatarService service = newService();

        String url = service.store(7L, png("wide.png", 800, 400));

        assertTrue(url.startsWith("/api/avatars/7?v="), "URL 应带用户 ID 与版本号: " + url);
        Path stored = service.fileOf(7L);
        assertTrue(Files.exists(stored), "头像文件未落盘");

        BufferedImage saved = ImageIO.read(stored.toFile());
        assertNotNull(saved, "落盘的不是可解析的图片");
        assertEquals(256, saved.getWidth());
        assertEquals(256, saved.getHeight());

        byte[] head = Files.readAllBytes(stored);
        assertEquals((byte) 0x89, head[0], "文件头不是 PNG(未重新编码)");
        assertEquals('P', head[1]);
    }

    @Test
    @DisplayName("换头像会覆写同一个文件,不会越换越多")
    void replacingKeepsSingleFile() throws IOException, InterruptedException {
        AvatarService service = newService();

        service.store(9L, png("a.png", 300, 300));
        Thread.sleep(5);
        String second = service.store(9L, png("b.png", 120, 500));

        try (Stream<Path> files = Files.list(service.fileOf(9L).getParent())) {
            List<Path> list = files.toList();
            assertEquals(1, list.size(), "同一用户目录下应只有一个头像文件: " + list);
        }
        assertTrue(second.startsWith("/api/avatars/9?v="), second);
    }

    @Test
    @DisplayName("伪装成图片的文本会被拒绝")
    void rejectsNonImage() {
        AvatarService service = newService();
        MockMultipartFile fake = new MockMultipartFile(
                "file", "avatar.png", "image/png", "这不是图片,只是一段文字".getBytes());

        RuntimeException error = assertThrows(RuntimeException.class, () -> service.store(1L, fake));
        assertTrue(error.getMessage().contains("无法识别"), error.getMessage());
        assertFalse(Files.exists(service.fileOf(1L)));
    }

    @Test
    @DisplayName("超过 2MB 直接拒绝,不进入解码")
    void rejectsTooLarge() {
        AvatarService service = newService();
        byte[] big = new byte[(int) AvatarService.MAX_BYTES + 1];

        RuntimeException error = assertThrows(RuntimeException.class,
                () -> service.store(1L, new MockMultipartFile("file", "big.png", "image/png", big)));
        assertTrue(error.getMessage().contains("2MB"), error.getMessage());
    }

    @Test
    @DisplayName("空文件与删除操作都不应抛出异常")
    void handlesEmptyAndDelete() {
        AvatarService service = newService();

        assertThrows(RuntimeException.class, () -> service.store(1L,
                new MockMultipartFile("file", "empty.png", "image/png", new byte[0])));

        // 没有头像时删除是幂等的:界面上的「恢复默认」可能被连点
        assertDoesNotThrow(() -> service.delete(1L));
    }
}
