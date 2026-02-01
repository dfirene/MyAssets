const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'info', 'warn', 'error']
    : ['error'],
});

// 處理 BigInt JSON 序列化
BigInt.prototype.toJSON = function () {
  return this.toString();
};

module.exports = prisma;
