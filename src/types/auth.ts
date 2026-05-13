/** 设置主密码响应 */
export interface SetupResult {
  success: boolean;
  lock_state: string;
}

/** 解锁响应 */
export interface UnlockResult {
  success: boolean;
  lock_state: string;
}

/** 锁定响应 */
export interface LockResult {
  success: boolean;
  lock_state: string;
}

/** 锁定状态响应 */
export interface GetLockStateResult {
  lock_state: string;
}

/** 修改密码响应 */
export interface ChangePasswordResult {
  success: boolean;
}
