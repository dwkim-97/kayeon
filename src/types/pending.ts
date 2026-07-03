import type {Drinking, Gender, Religion, Smoking} from '@/types/profile';

export type PendingProfile = {
  id: string;
  gender: Gender;
  birthYear: number;
  height: number;
  residence: string;
  job: string;
  religion: Religion;
  mbti: string;
  hobbies: string;
  smoking: Smoking;
  drinking: Drinking;
  idealType: string;
  matchmakerComment: string;
  extra: string;
  photoUrls: string[];
  submittedBy: string;
  createdAt: string;
};
