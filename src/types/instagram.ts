export interface InstagramSavedResponse {
  num_results: number;
  more_available: boolean;
  items: InstagramSavedItem[];
  next_max_id?: string;
  status: string;
}

export interface InstagramSavedItem {
  media: InstagramMedia;
}

export interface InstagramMedia {
  pk: number;
  id: string;
  code: string;
  media_type: number;
  taken_at: number;
  like_count: number;
  comment_count: number;
  caption?: {
    text: string;
  } | null;
  image_versions2?: {
    candidates: Array<{
      url: string;
      width: number;
      height: number;
    }>;
  };
  carousel_media_count?: number;
  carousel_media?: InstagramCarouselMedia[];
  user: InstagramUser;
}

export interface InstagramCarouselMedia {
  pk: number;
  media_type: number;
  image_versions2?: {
    candidates: Array<{
      url: string;
      width: number;
      height: number;
    }>;
  };
  video_versions?: Array<{
    url: string;
    width: number;
    height: number;
  }>;
  video_duration?: number;
}

export interface InstagramUser {
  pk: number;
  username: string;
  full_name: string;
  is_verified: boolean;
  is_private: boolean;
  profile_pic_url: string;
}
