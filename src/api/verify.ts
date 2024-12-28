import { Utils } from '@/utils'
import { request } from './request'

export const verifyApi = {
  /**
   * 验证密码
   * @param password 密码
   */
  verify(password: string) {
    return request.post<void>('/verify', { password }).then((data) => {
      Utils.store2Cookies()
      return data
    })
  },
}
