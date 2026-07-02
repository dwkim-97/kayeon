export type MatchStatus = 'ongoing' | 'ended';

export type Match = {
  id: string;
  femaleId: string;
  maleId: string;
  status: MatchStatus;
  memo: string;
  createdByName: string;
  createdAt: string;
  endedAt: string | null;
};
