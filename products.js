

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

 }
