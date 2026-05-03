import rateLimit from 'express-rate-limit'

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 50,
  standardHeaders: 'draft-8',
  legacyHeaders: true,
  ipv6Subnet: 56,
  statusCode: 503,
  message: '<h1>503 Service Temporarily Unavailable</h1>' +
    '<p>The server is temporarily unable to service your request due to overload or maintenance downtime.<br/>Please try again later.</p>'
})

export default limiter
