import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8, '密码至少需要 8 位'),
  displayName: z.string().trim().min(1).max(120).optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1, '密码不能为空'),
});

export const updateProfileSchema = z.object({
  displayName: z.string().trim().min(1, '昵称不能为空').max(120, '昵称不能超过 120 个字符'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, '当前密码不能为空'),
  newPassword: z.string().min(8, '新密码至少需要 8 位'),
}).refine((value) => value.currentPassword !== value.newPassword, {
  message: '新密码不能与当前密码相同',
  path: ['newPassword'],
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
