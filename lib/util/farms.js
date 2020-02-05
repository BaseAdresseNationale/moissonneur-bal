const workerFarm = require('worker-farm')

const registeredFarms = []

function registerFarm(farm) {
  registeredFarms.push(farm)
}

function endFarms() {
  registeredFarms.forEach(farm => workerFarm.end(farm))
}

module.exports = {registerFarm, endFarms}
