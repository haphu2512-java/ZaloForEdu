const ApiError = require('../utils/apiError');

const applyParsedPayload = (target, parsed) => {
  if (target && typeof target === 'object') {
    for (const key of Object.keys(target)) {
      if (!(key in parsed)) {
        delete target[key];
      }
    }

    Object.assign(target, parsed);
    return target;
  }

  return parsed;
};

const validate = (schemas) => (req, _res, next) => {
  try {
    if (schemas.body) {
      req.body = applyParsedPayload(req.body, schemas.body.parse(req.body));
    }
    if (schemas.params) {
      req.params = applyParsedPayload(req.params, schemas.params.parse(req.params));
    }
    if (schemas.query) {
      req.query = applyParsedPayload(req.query, schemas.query.parse(req.query));
    }
    next();
  } catch (error) {
    next(new ApiError(400, 'VALIDATION_ERROR', 'Invalid payload', error));
  }
};

module.exports = validate;
