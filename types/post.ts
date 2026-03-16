export interface Post {
  slug: string;
  title: string;
  summary: string;
  content: string;
  publishedAt: string;
  updatedAt?: string;
  tags?: string[];
  coverImage?: string;
  author?: {
    name: string;
    avatar?: string;
  };
}

export interface PostMeta {
  slug: string;
  title: string;
  summary: string;
  publishedAt: string;
  tags?: string[];
  coverImage?: string;
}
