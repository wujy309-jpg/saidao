package com.saidao.backend.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.file.AtomicMoveNotSupportedException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;

/**
 * 头像文件存储：把用户上传的任意图片统一处理成 256×256 的正方形 PNG。
 *
 * <p>为什么服务端要重新编码而不是原样落盘：
 * <ol>
 *   <li>头像在页面上是圆形小图，原图动辄几 MB，直接回源又慢又浪费带宽；</li>
 *   <li>只按后缀名判断类型不可靠，真正解码一次才能确认「这确实是一张图片」；</li>
 *   <li>统一成方形后，前端各处 &lt;img&gt; 不需要再关心原始宽高比。</li>
 * </ol>
 *
 * <p>落盘位置：{@code {file.upload-dir}/avatars/{userId}/avatar.png}，每人固定一个文件名
 * （换头像即覆写），因此不会随换头像次数累积垃圾文件。读取出口见 {@code AvatarController}。
 */
@Slf4j
@Service
public class AvatarService {

    /** 统一裁切后的边长（展示最大也就 96px，256 足够清晰） */
    private static final int SIDE = 256;

    /** 上传体积上限 */
    public static final long MAX_BYTES = 2L * 1024 * 1024;

    /** 解码前的像素上限，防止「解压炸弹」把内存吃满 */
    private static final long MAX_PIXELS = 40_000_000L;

    private static final String FILE_NAME = "avatar.png";

    /** 头像公开读取路径前缀（与 AvatarController 的映射一致） */
    public static final String PUBLIC_PREFIX = "/api/avatars/";

    @Value("${file.upload-dir:./uploads}")
    private String uploadDir;

    /** 某个用户头像文件的绝对路径（不一定存在） */
    public Path fileOf(Long userId) {
        return root().resolve(String.valueOf(userId)).resolve(FILE_NAME);
    }

    private Path root() {
        return Paths.get(uploadDir).toAbsolutePath().normalize().resolve("avatars");
    }

    /**
     * 保存头像并返回带版本号的公开 URL。
     * 版本号让「换成另一张图」后浏览器立刻拿到新图，而不用等缓存过期。
     */
    public String store(Long userId, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new RuntimeException("请选择要上传的图片");
        }
        if (file.getSize() > MAX_BYTES) {
            throw new RuntimeException("图片不能超过 2MB,请压缩后再上传");
        }

        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (IOException e) {
            throw new RuntimeException("图片读取失败,请重试");
        }

        BufferedImage source = decode(bytes);
        if (source == null) {
            throw new RuntimeException("无法识别该图片,请上传 PNG / JPG / GIF / BMP 格式");
        }
        if ((long) source.getWidth() * source.getHeight() > MAX_PIXELS) {
            throw new RuntimeException("图片尺寸过大,请换一张更小的图片");
        }

        BufferedImage squared = squareTo(source, SIDE);
        Path target = fileOf(userId);
        try {
            Files.createDirectories(target.getParent());
            // 先写临时文件再原子替换：并发请求不会读到写了一半的 PNG
            Path tmp = target.resolveSibling(FILE_NAME + ".tmp");
            if (!ImageIO.write(squared, "png", tmp.toFile())) {
                throw new IOException("PNG 编码器不可用");
            }
            try {
                Files.move(tmp, target, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
            } catch (AtomicMoveNotSupportedException e) {
                Files.move(tmp, target, StandardCopyOption.REPLACE_EXISTING);
            }
        } catch (IOException e) {
            log.warn("头像写入失败 userId={}: {}", userId, e.getMessage());
            throw new RuntimeException("头像保存失败,请重试");
        }

        return publicUrl(userId);
    }

    /** 删除该用户已落盘的头像（不存在时静默返回） */
    public void delete(Long userId) {
        try {
            Files.deleteIfExists(fileOf(userId));
        } catch (IOException e) {
            log.warn("头像删除失败 userId={}: {}", userId, e.getMessage());
        }
    }

    /** 生成带缓存版本号的公开 URL */
    public String publicUrl(Long userId) {
        return PUBLIC_PREFIX + userId + "?v=" + System.currentTimeMillis();
    }

    private static BufferedImage decode(byte[] bytes) {
        try {
            return ImageIO.read(new ByteArrayInputStream(bytes));
        } catch (IOException | RuntimeException e) {
            // 有些「伪装成图片」的文件会让解码器抛异常,统一当作无法识别
            return null;
        }
    }

    /** 取中心正方形并缩放到 side×side（一步完成裁切与缩放） */
    private static BufferedImage squareTo(BufferedImage src, int side) {
        int edge = Math.min(src.getWidth(), src.getHeight());
        int x = (src.getWidth() - edge) / 2;
        int y = (src.getHeight() - edge) / 2;

        BufferedImage out = new BufferedImage(side, side, BufferedImage.TYPE_INT_ARGB);
        Graphics2D g = out.createGraphics();
        try {
            g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
            g.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
            g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
            g.drawImage(src, 0, 0, side, side, x, y, x + edge, y + edge, null);
        } finally {
            g.dispose();
        }
        return out;
    }
}
