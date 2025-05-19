export const ACQUIRE_SCRIPT = `
-- KEYS[1]: lockKey
-- ARGV[1]: lockValue
-- ARGV[2]: lockTimeout

-- Try to acquire the lock
local acquired = redis.call('SET', KEYS[1], ARGV[1], 'NX', 'PX', ARGV[2])
if acquired then
  return 1
else
  return 0
end
`;

export const RELEASE_SCRIPT = `
-- KEYS[1]: lockKey
-- ARGV[1]: lockValue

-- Check if the lock still belongs to us before releasing it
local value = redis.call('GET', KEYS[1])
if value == ARGV[1] then
  return redis.call('DEL', KEYS[1])
else
  return 0
end
`;

export const EXTEND_SCRIPT = `
-- KEYS[1]: lockKey
-- ARGV[1]: lockValue
-- ARGV[2]: lockTimeout

-- Check if the lock still belongs to us before extending it
local value = redis.call('GET', KEYS[1])
if value == ARGV[1] then
  return redis.call('PEXPIRE', KEYS[1], ARGV[2])
else
  return 0
end
`;

export const REFRESH_SCRIPT = `
-- KEYS[1]: lockKey
-- ARGV[1]: lockValue
-- ARGV[2]: lockTimeout

-- Check if the lock still belongs to us before refreshing it
local value = redis.call('GET', KEYS[1])
if value == ARGV[1] then
  return redis.call('PEXPIRE', KEYS[1], ARGV[2])
else
  return 0
end
`;
