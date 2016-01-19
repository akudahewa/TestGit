var async = require('async');
var boom = require('boom');
var hoek = require('hoek');
var config = require('../../../configuration');

exports.show = function (request, reply) {
  var startTime = new Date();
  var log = '';
  var correlationId = request.headers['correlation-id'];
  var endTime = '';
  var latency = '';

  if (correlationId) {
    log = 'Start: Correlation Id: ' + correlationId + ' timestamp :' + startTime.toHighPrecisionTimeString();
  } else {
    correlationId = 'exchange-autoGen' + Date.now() + Math.random().toString().split('.')[1];
    log = 'Start: Correlation Id: ' + correlationId + ' timestamp :' + startTime.toHighPrecisionTimeString();
  }

  console.log(log);

  var self = this;
  var options = {};

  if (request.auth.isAuthenticated) {
    options.userPermissions = request.auth.user.permissions;
  }
  async.waterfall([
      this.product.getById.bind(this, request, options),
      addCapabilitiesToProduct.bind(this, request.auth.user, request.url.query.lmsIntegrationToken)
    ],
    function allDone(error, product) {

      if (error) {
        if (error.isBoom && error.output.statusCode === 403 && !request.auth.isAuthenticated) {
         return reply(boom.unauthorized());
        }
        endTime = new Date();
        latency = endTime - startTime;

        return reply(error);
      }

      if (!product) {
        console.log('The request with correaltion id ' + correlationId + 'failed : Product not found');
        return reply(boom.notFound());
      }
      endTime = new Date();
      latency = endTime - startTime;
      log = 'End: Correlation Id: ' + correlationId + ' timestamp :' + endTime.toHighPrecisionTimeString();
      console.log(log);
      product.providerSystem=product._providerSystem;
      reply(product).
        header('correlation-id', correlationId).
        header('start-time', startTime.toHighPrecisionTimeString()).
        header('end-time', endTime.toHighPrecisionTimeString()).
        header('latency', latency + 'ms');


    }
  );
};

exports.showProducts = function (request, reply) {
  var startTime = new Date();
  var log = '';
  var correlationId = request.headers['correlation-id'];
  var endTime = '';
  var latency = '';

  if (correlationId) {
    log = 'Start: Correlation Id: ' + correlationId + ' timestamp :' + startTime.toHighPrecisionTimeString();
  } else {
    correlationId = 'exchange-autoGen' + Date.now() + Math.random().toString().split('.')[1];
    log = 'Start: Correlation Id: ' + correlationId + ' timestamp :' + startTime.toHighPrecisionTimeString();
  }
  var entity = require(config.data.productDataPath);
   if (!entity) return reply.continue();

  entity.forEach(function (item) {
    Object.keys(item).forEach(function (key) {
      if (key[0] === '_') {
       //  Sending the keys until a perm fix
       // delete item[key];
      }
    });
  });
  endTime = new Date();
  latency = endTime - startTime;
  log = 'End: Correlation Id: ' + correlationId + ' timestamp :' + endTime.toHighPrecisionTimeString();
  console.log(log);
  reply(entity).
    header('correlation-id', correlationId).
    header('start-time',startTime.toHighPrecisionTimeString()).
    header('end-time',endTime.toHighPrecisionTimeString()).
    header('latency',latency+'ms');
};

function addCapabilitiesToProduct(user, lmsIntegrationToken, product, next) {
  if (!product) return next();
 // console.log(product);
  this.product.getCapabilities(product, user, function (error, capabilities) {
    if (error) return next(error);

    product.potentialAction = hoek.merge(product.potentialAction || {}, capabilities);

    return next(null, product);
  }, lmsIntegrationToken);
}
