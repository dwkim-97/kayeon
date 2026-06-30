export type Json = string | number | boolean | null | {[key: string]: Json | undefined} | Json[];

type ProfileGender = 'male' | 'female';
type ProfileStatus = 'active' | 'blocked';
type ProfileReligion = 'christian' | 'buddhist' | 'catholic' | 'none' | 'not_selected';
type ProfileSmoking = 'smoker' | 'non_smoker' | 'not_selected';
type ProfileDrinking = 'drinker' | 'non_drinker' | 'not_selected';
type HistoryEventType =
  | 'profile_created'
  | 'profile_updated'
  | 'profile_deleted'
  | 'profile_blocked'
  | 'profile_activated'
  | 'admin_created'
  | 'admin_removed';

export type Database = {
  public: {
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
    Tables: {
      profiles: {
        Row: {
          id: string;
          gender: ProfileGender;
          status: ProfileStatus;
          author_name: string;
          residence: string;
          birth_year: number;
          height: number;
          job: string;
          religion: ProfileReligion;
          mbti: string;
          hobbies: string;
          smoking: ProfileSmoking;
          drinking: ProfileDrinking;
          ideal_type: string;
          matchmaker_comment: string;
          extra: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          gender: ProfileGender;
          status: ProfileStatus;
          author_name: string;
          residence: string;
          birth_year: number;
          height: number;
          job: string;
          religion: ProfileReligion;
          mbti: string;
          hobbies: string;
          smoking: ProfileSmoking;
          drinking: ProfileDrinking;
          ideal_type: string;
          matchmaker_comment: string;
          extra: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          gender?: ProfileGender;
          status?: ProfileStatus;
          author_name?: string;
          residence?: string;
          birth_year?: number;
          height?: number;
          job?: string;
          religion?: ProfileReligion;
          mbti?: string;
          hobbies?: string;
          smoking?: ProfileSmoking;
          drinking?: ProfileDrinking;
          ideal_type?: string;
          matchmaker_comment?: string;
          extra?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      profile_photos: {
        Row: {
          id: string;
          profile_id: string;
          storage_path: string;
          alt: string;
          order: number;
          created_at: string;
        };
        Insert: {
          id: string;
          profile_id: string;
          storage_path: string;
          alt: string;
          order: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          storage_path?: string;
          alt?: string;
          order?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      history_events: {
        Row: {
          id: string;
          type: HistoryEventType;
          actor_name: string;
          target_label: string;
          description: string;
          created_at: string;
        };
        Insert: {
          id: string;
          type: HistoryEventType;
          actor_name: string;
          target_label: string;
          description: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          type?: HistoryEventType;
          actor_name?: string;
          target_label?: string;
          description?: string;
          created_at?: string;
        };
        Relationships: [];
      };
    };
  };
};
