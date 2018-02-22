var async = require('async');
var noble = require('noble');
 var Gpio = require('onoff').Gpio,
	tv = new Gpio(17,'out'),
	ac = new Gpio(27, 'out'),
	light = new Gpio(22, 'out');
var isFirstNotificationAfterConnect = false;

var CoveDeviceName = 'Clove_1_90060SL01';

console.log('   Searching for ' + CoveDeviceName);

noble.on('stateChange', (state) => onStateChanged(state));

noble.on('discover', (peripheral) => onDeviceDiscovered(peripheral));

function onStateChanged(state) {
  if (state === 'poweredOn') {
    noble.startScanning();
  } else {
    noble.stopScanning();
  }
}

function onDeviceDiscovered(device){
  if (device.advertisement.localName === peripheralIdOrAddress) {
    noble.stopScanning();
    connect(device);
  }
}

function onDeviceDisconnected(){
  console.log('   Device disconnected.')
  process.exit(0);
}

function connect(device) {
  device.on('disconnect', () => onDeviceDisconnected());

  device.connect((error) => {
  isFirstNotificationAfterConnect = true;
    peripheral.discoverServices(['000056ef00001000800000805f9b34fb'], function(error, services) {
      var serviceIndex = 0;

      async.whilst(
        function () {
          return (serviceIndex < services.length);
        },
        function(callback) {
          var service = services[serviceIndex];
          var serviceInfo = service.uuid;

          if (service.name) {
            serviceInfo += ' (' + service.name + ')';
          }
          console.log(serviceInfo);

          service.discoverCharacteristics(['000034e200001000800000805f9b34fb'], function(error, characteristics) {
            var characteristicIndex = 0;
	    var buttonPushNotification = characteristics[0];
            async.whilst(
              function () {
                return (characteristicIndex < characteristics.length);
              },
              function(callback) {
                var characteristic = characteristics[characteristicIndex];
                var characteristicInfo = '  ' + characteristic.uuid;

                if (characteristic.name) {
                  characteristicInfo += ' (' + characteristic.name + ')';
                }

                async.series([
                  function(callback) {
                    characteristic.discoverDescriptors(function(error, descriptors) {
                      async.detect(
                        descriptors,
                        function(descriptor, callback) {
                          if (descriptor.uuid === '2901') {
                            return callback(descriptor);
                          } else {
                            return callback();
                          }
                        },
                        function(userDescriptionDescriptor){
                          if (userDescriptionDescriptor) {
                            userDescriptionDescriptor.readValue(function(error, data) {
                              if (data) {
                                characteristicInfo += ' (' + data.toString() + ')';
                              }
                              callback();
                            });
                          } else {
                            callback();
                          }
                        }
                      );
                    });
                  },
                  function(callback) {
                        characteristicInfo += '\n    properties  ' + characteristic.properties.join(', ');

                    if (characteristic.properties.indexOf('read') !== -1) {
                      characteristic.read(function(error, data) {
                        if (data) {
                          var string = data.toString('ascii');

                          characteristicInfo += '\n    value       ' + data.toString('hex') + ' | \'' + string + '\'';
                        }
                        callback();
                      });
                    } else {
                      callback();
                    }
                  },
                  function() {
                    console.log(characteristicInfo);
                    characteristicIndex++;
                    callback();
                  }
                ]);
		buttonPushNotification.on('data', function(data, isNotification) {
			if(!isFirstNotificationAfterConnect) {
			    console.log('Notification received ' + data);
				if (data == 'S1') {
					console.log('Toggling TV');
					tv.read(function(err, value){
						if (err) {
							console.log('Error reading TV led value');
							peripheral.disconnect();
						}
						tv.write(value ^ 1, function(err) {
							if (err) {
								console.log('Error writing TV led value');
								peripheral.disconnect();
							}
						});
					});
				} else if (data == 'S2') {
					console.log('Toggling Light');
						light.read(function(err, value){
						if (err) {
							console.log('Error reading Light led value');
							peripheral.disconnect();
						}
						light.write(value ^ 1, function(err) {
							if (err) {
								console.log('Error writing Light led value');
								peripheral.disconnect();
							}
						});
					});
				} else if (data == 'S3') {
					console.log('Toggling AC');
						ac.read(function(err, value){
						if (err) {
							console.log('Error reading AC led value');
							peripheral.disconnect();
						}
						ac.write(value ^ 1, function(err) {
							if (err) {
								console.log('Error writing AC led value');
								peripheral.disconnect();
							}
						});
					});
				}
			} else {
				isFirstNotificationAfterConnect = false;
			}
		});
		buttonPushNotification.subscribe(function(error){
			console.log('Subscribed to button press');
		});
              },
              function(error) {
                serviceIndex++;
                callback();
              }
            );
          });
        },
        function (err) {
          //peripheral.disconnect();
	console.log('Finished');

        }
      );
    });
  });
}