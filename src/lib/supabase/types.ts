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
          target_label: string;
          description: string;
          created_at: string;
        };
        Insert: {
          id?: string;
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
