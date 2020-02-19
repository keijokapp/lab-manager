"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.asyncMiddleware = asyncMiddleware;

function asyncMiddleware(handler) {
  return function (req, res, next) {
    handler(req, res, next).then(() => {
      if (!res.finished) {
        next();
      }
    }).catch(e => {
      if (!res.finished) {
        next(e);
      }
    });
  };
}