/** 代码仓库相关类型 */

import type { UserBrief } from './user';

export interface Repo {
  id: number;
  name: string;
  description?: string;
  projectId?: number;
  owner?: UserBrief | number;
  defaultBranch?: string;
  visibility: 'PUBLIC' | 'PRIVATE';
  language?: string;
  starCount?: number;
  createdAt?: string;
}

export interface RepoBranch {
  id: number;
  name: string;
  latestCommitId?: string;
  isProtected?: boolean;
}

export interface RepoFile {
  id: number;
  branchName?: string;
  filePath?: string;
  fileName?: string;
  content?: string;
  /** 是否为磁盘存储的二进制文件，内容通过 download 接口获取 */
  binary?: boolean;
  fileType: 'FILE' | 'DIRECTORY';
  fileSize?: number;
  lastCommitHash?: string;
  lastModifiedBy?: UserBrief;
  lastModifiedAt?: string;
}

export interface RepoCommit {
  id: number;
  commitHash?: string;
  message: string;
  description?: string;
  author?: UserBrief;
  parentHash?: string;
  filesChanged?: number;
  additions?: number;
  deletions?: number;
  committedAt?: string;
}

export interface RepoDiff {
  filePath: string;
  changeType: 'ADDED' | 'MODIFIED' | 'DELETED';
  beforeContent?: string | null;
  afterContent?: string | null;
  binary?: boolean;
  additions?: number;
  deletions?: number;
}

export interface RepoMember {
  id: number;
  user: UserBrief;
  role: 'OWNER' | 'MAINTAINER' | 'DEVELOPER' | 'REPORTER' | 'GUEST';
}
