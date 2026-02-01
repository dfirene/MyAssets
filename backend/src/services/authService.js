const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const prisma = require('../models/prisma');
const logger = require('../utils/logger');

/**
 * 認證服務
 */
class AuthService {
  /**
   * 使用者登入
   */
  async login(account, password, ipAddress, userAgent) {
    // 查詢使用者
    const user = await prisma.user.findUnique({
      where: { account },
      include: {
        department: true,
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    // 記錄登入嘗試
    const logLogin = async (status) => {
      if (user) {
        await prisma.loginLog.create({
          data: {
            userId: user.id,
            ipAddress,
            userAgent,
            status,
          },
        });
      }
    };

    if (!user) {
      logger.warn(`Login failed: account not found - ${account}`);
      throw new Error('帳號或密碼錯誤');
    }

    if (user.status !== 'active') {
      await logLogin('failed');
      logger.warn(`Login failed: account inactive - ${account}`);
      throw new Error('帳號已停用');
    }

    // 驗證密碼
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      await logLogin('failed');
      logger.warn(`Login failed: wrong password - ${account}`);
      throw new Error('帳號或密碼錯誤');
    }

    // 更新最後登入時間
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // 記錄成功登入
    await logLogin('success');

    // 產生 Token
    const token = this.generateToken(user);
    const refreshToken = this.generateRefreshToken(user);

    logger.info(`User logged in: ${account}`);

    return {
      token,
      refreshToken,
      user: {
        id: user.id.toString(),
        account: user.account,
        name: user.name,
        email: user.email,
        department: user.department,
        roles: user.roles.map((ur) => ({
          code: ur.role.code,
          name: ur.role.name,
        })),
      },
    };
  }

  /**
   * 產生 JWT Token
   */
  generateToken(user) {
    return jwt.sign(
      {
        userId: user.id.toString(),
        account: user.account,
      },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );
  }

  /**
   * 產生 Refresh Token
   */
  generateRefreshToken(user) {
    return jwt.sign(
      {
        userId: user.id.toString(),
        type: 'refresh',
      },
      config.jwt.secret,
      { expiresIn: '7d' }
    );
  }

  /**
   * 更新 Token
   */
  async refreshToken(refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, config.jwt.secret);
      
      if (decoded.type !== 'refresh') {
        throw new Error('無效的 Refresh Token');
      }

      const user = await prisma.user.findUnique({
        where: { id: BigInt(decoded.userId) },
      });

      if (!user || user.status !== 'active') {
        throw new Error('使用者不存在或已停用');
      }

      return {
        token: this.generateToken(user),
        refreshToken: this.generateRefreshToken(user),
      };
    } catch (error) {
      throw new Error('Refresh Token 無效或已過期');
    }
  }

  /**
   * 變更密碼
   */
  async changePassword(userId, oldPassword, newPassword) {
    const user = await prisma.user.findUnique({
      where: { id: BigInt(userId) },
    });

    if (!user) {
      throw new Error('使用者不存在');
    }

    // 驗證舊密碼
    const isValidPassword = await bcrypt.compare(oldPassword, user.password);
    if (!isValidPassword) {
      throw new Error('舊密碼錯誤');
    }

    // 加密新密碼
    const hashedPassword = await bcrypt.hash(newPassword, config.password.saltRounds);

    // 更新密碼
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    logger.info(`Password changed for user: ${user.account}`);
  }

  /**
   * 重設密碼（管理員用）
   */
  async resetPassword(userId, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, config.password.saltRounds);

    await prisma.user.update({
      where: { id: BigInt(userId) },
      data: { password: hashedPassword },
    });

    logger.info(`Password reset for user ID: ${userId}`);
  }
}

module.exports = new AuthService();
