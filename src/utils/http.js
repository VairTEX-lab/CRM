function badRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function notFound(entity) {
  const error = new Error(`${entity} not found`);
  error.statusCode = 404;
  return error;
}

function unauthorized(message = "Unauthorized") {
  const error = new Error(message);
  error.statusCode = 401;
  return error;
}

module.exports = {
  badRequest,
  notFound,
  unauthorized
};
