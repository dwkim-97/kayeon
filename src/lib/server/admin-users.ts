import {buildInternalAuthEmail, invalidLoginIdMessage, normalizeLoginId} from '@/lib/auth/internal-email';
import {createSupabaseAdminClient} from '@/lib/supabase/admin';
import type {ManagedUser} from '@/types/user';

export type CreateManagedUserInput = {
  name: string;
  loginId: string;
  password: string;
  recommenderName: string;
  phoneNumber: string;
};

type PreparedManagedUserCreateInput = CreateManagedUserInput & {
  authEmail: string;
};

export type UserMutationResult =
  | {
      success: true;
      user: ManagedUser;
    }
  | {
      success: false;
      message: string;
    };

type AppUserRow = {
  id: string;
  login_id: string;
  auth_email: string;
  name: string;
  recommender_name: string;
  phone_number: string;
  created_at: string;
};

export type PrepareManagedUserCreateResult =
  | {
      success: true;
      value: PreparedManagedUserCreateInput;
    }
  | {
      success: false;
      message: string;
    };

function toManagedUser(user: AppUserRow): ManagedUser {
  return {
    id: user.id,
    name: user.name,
    loginId: user.login_id,
    recommenderName: user.recommender_name,
    phoneNumber: user.phone_number,
    createdAt: user.created_at,
  };
}

export function prepareManagedUserCreateInput(input: CreateManagedUserInput): PrepareManagedUserCreateResult {
  const name = input.name.trim();
  const loginIdInput = input.loginId.trim();
  const password = input.password.trim();
  const recommenderName = input.recommenderName.trim();
  const phoneNumber = input.phoneNumber.trim();

  if (!name || !loginIdInput || !password || !recommenderName || !phoneNumber) {
    return {
      success: false,
      message: '필수 값을 모두 입력해 주세요.',
    };
  }

  let loginId: string;

  try {
    loginId = normalizeLoginId(input.loginId);
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : invalidLoginIdMessage,
    };
  }

  if (password.length < 8) {
    return {
      success: false,
      message: '비밀번호는 8자 이상으로 입력해 주세요.',
    };
  }

  return {
    success: true,
    value: {
      name,
      loginId,
      authEmail: buildInternalAuthEmail(loginId),
      password,
      recommenderName,
      phoneNumber,
    },
  };
}

export async function listManagedUsers() {
  const supabase = createSupabaseAdminClient();
  const {data, error} = await supabase
    .from('app_users')
    .select('id, login_id, auth_email, name, recommender_name, phone_number, created_at')
    .is('removed_at', null)
    .order('created_at', {ascending: false});

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as AppUserRow[]).map(toManagedUser);
}

export async function findAuthEmailForLoginId(loginIdInput: string) {
  let loginId: string;

  try {
    loginId = normalizeLoginId(loginIdInput);
  } catch {
    return null;
  }

  const supabase = createSupabaseAdminClient();
  const {data, error} = await supabase
    .from('app_users')
    .select('auth_email')
    .eq('login_id', loginId)
    .is('removed_at', null)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as Pick<AppUserRow, 'auth_email'> | null)?.auth_email ?? null;
}

export async function createManagedUser(input: CreateManagedUserInput): Promise<UserMutationResult> {
  const prepared = prepareManagedUserCreateInput(input);

  if (!prepared.success) {
    return prepared;
  }

  const supabase = createSupabaseAdminClient();
  const {value} = prepared;
  const {data: authData, error: authError} = await supabase.auth.admin.createUser({
    email: value.authEmail,
    password: value.password,
    email_confirm: true,
    user_metadata: {
      name: value.name,
    },
    app_metadata: {
      login_id: value.loginId,
    },
  });

  if (authError) {
    return {
      success: false,
      message: authError.message.includes('already') ? '이미 사용 중인 아이디입니다.' : authError.message,
    };
  }

  const authUser = authData.user;

  if (!authUser) {
    return {
      success: false,
      message: '관리자 계정을 생성하지 못했습니다.',
    };
  }

  const {data, error} = await supabase
    .from('app_users')
    .insert({
      id: authUser.id,
      login_id: value.loginId,
      auth_email: value.authEmail,
      name: value.name,
      recommender_name: value.recommenderName,
      phone_number: value.phoneNumber,
    })
    .select('id, login_id, auth_email, name, recommender_name, phone_number, created_at')
    .single();

  if (error) {
    await supabase.auth.admin.deleteUser(authUser.id);

    return {
      success: false,
      message: error.code === '23505' ? '이미 사용 중인 아이디입니다.' : error.message,
    };
  }

  return {
    success: true,
    user: toManagedUser(data as AppUserRow),
  };
}

export async function removeManagedUser(userId: string): Promise<UserMutationResult> {
  const supabase = createSupabaseAdminClient();
  const {data, error} = await supabase
    .from('app_users')
    .select('id, login_id, auth_email, name, recommender_name, phone_number, created_at')
    .is('removed_at', null);

  if (error) {
    return {
      success: false,
      message: error.message,
    };
  }

  const users = (data ?? []) as AppUserRow[];

  if (users.length <= 1) {
    return {
      success: false,
      message: '마지막 관리자는 제거할 수 없습니다.',
    };
  }

  const user = users.find(currentUser => currentUser.id === userId);

  if (!user) {
    return {
      success: false,
      message: '관리자를 찾을 수 없습니다.',
    };
  }

  const {error: updateError} = await supabase
    .from('app_users')
    .update({removed_at: new Date().toISOString()})
    .eq('id', userId)
    .is('removed_at', null);

  if (updateError) {
    return {
      success: false,
      message: updateError.message,
    };
  }

  await supabase.auth.admin.updateUserById(userId, {ban_duration: '876000h'});

  return {
    success: true,
    user: toManagedUser(user),
  };
}
