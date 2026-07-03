import type {HistoryEventType} from '@/types/history';
import type {Drinking, Gender, Religion, Smoking, ProfileStatus} from '@/types/profile';

export type Json = string | number | boolean | null | {[key: string]: Json | undefined} | Json[];

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
          gender: Gender;
          status: ProfileStatus;
          author_name: string;
          residence: string;
          birth_year: number;
          height: number;
          job: string;
          religion: Religion;
          mbti: string;
          hobbies: string;
          smoking: Smoking;
          drinking: Drinking;
          ideal_type: string;
          matchmaker_comment: string;
          extra: string;
          starred_by_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          gender: Gender;
          status: ProfileStatus;
          author_name: string;
          residence: string;
          birth_year: number;
          height: number;
          job: string;
          religion: Religion;
          mbti: string;
          hobbies: string;
          smoking: Smoking;
          drinking: Drinking;
          ideal_type: string;
          matchmaker_comment: string;
          extra: string;
          starred_by_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          gender?: Gender;
          status?: ProfileStatus;
          author_name?: string;
          residence?: string;
          birth_year?: number;
          height?: number;
          job?: string;
          religion?: Religion;
          mbti?: string;
          hobbies?: string;
          smoking?: Smoking;
          drinking?: Drinking;
          ideal_type?: string;
          matchmaker_comment?: string;
          extra?: string;
          starred_by_name?: string | null;
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
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id: string;
          profile_id: string;
          storage_path: string;
          alt: string;
          sort_order: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          storage_path?: string;
          alt?: string;
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'profile_photos_profile_id_fkey';
            columns: ['profile_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      history_events: {
        Row: {
          id: string;
          type: HistoryEventType;
          actor_name: string;
          actor_id: string | null;
          target_label: string;
          description: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          type: HistoryEventType;
          actor_name: string;
          actor_id?: string | null;
          target_label: string;
          description: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          type?: HistoryEventType;
          actor_name?: string;
          actor_id?: string | null;
          target_label?: string;
          description?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      matches: {
        Row: {
          id: string;
          female_id: string;
          male_id: string;
          status: 'ongoing' | 'ended';
          memo: string;
          created_by_name: string;
          created_at: string;
          ended_at: string | null;
        };
        Insert: {
          id?: string;
          female_id: string;
          male_id: string;
          status?: 'ongoing' | 'ended';
          memo?: string;
          created_by_name: string;
          created_at?: string;
          ended_at?: string | null;
        };
        Update: {
          status?: 'ongoing' | 'ended';
          memo?: string;
          ended_at?: string | null;
        };
        Relationships: [];
      };
      pending_profiles: {
        Row: {
          id: string;
          gender: Gender;
          birth_year: number;
          height: number;
          residence: string;
          job: string;
          religion: Religion;
          mbti: string;
          hobbies: string;
          smoking: Smoking;
          drinking: Drinking;
          ideal_type: string;
          matchmaker_comment: string;
          extra: string;
          photo_paths: string[];
          submitted_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          gender: Gender;
          birth_year: number;
          height: number;
          residence: string;
          job: string;
          religion?: Religion;
          mbti?: string;
          hobbies?: string;
          smoking?: Smoking;
          drinking?: Drinking;
          ideal_type?: string;
          matchmaker_comment?: string;
          extra?: string;
          photo_paths?: string[];
          submitted_by?: string;
          created_at?: string;
        };
        Update: {[key: string]: never};
        Relationships: [];
      };
    };
  };
};
