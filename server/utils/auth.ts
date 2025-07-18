import CryptoJS from 'crypto-js'
import { argon2id } from '@noble/hashes/argon2'

export const Auth = {
  encrypt: async (key: string, data: string) => {
    return CryptoJS.AES.encrypt(data, key).toString()
  },
  decrypt: async (key: string, data: string) => {
    return CryptoJS.AES.decrypt(data, key).toString(CryptoJS.enc.Utf8)
  },
  /**
   * Hash password using Argon2id algorithm
   */
  hashPassword: async (key: string, word: string, password: string): Promise<string> => {
    const startTime = Date.now()
    // Build salt: key + word to ensure uniqueness and security
    const saltInput = `${key}:${word}`
    const salt = new TextEncoder().encode(saltInput)

    const passwordBytes = new TextEncoder().encode(password)
    const hashBytes = argon2id(passwordBytes, salt, {
      t: 1,
      m: 6144,
      p: 1,
      dkLen: 32,
    })

    // Convert Uint8Array to Base64 string for storage
    const hashBase64 = btoa(String.fromCharCode.apply(null, Array.from(hashBytes)))
    console.log(`hash password for word [${word}]: ${Date.now() - startTime}ms`)
    return hashBase64
  },
  /**
   * Verify password against hashed password
   */
  verifyPassword: async (
    key: string,
    word: string,
    password: string,
    hashedPassword: string,
  ): Promise<boolean> => {
    try {
      const computedHash = await Auth.hashPassword(key, word, password)
      return computedHash === hashedPassword
    } catch (error) {
      console.error('Password verification failed:', error)
      return false
    }
  },
}
