#!/usr/bin/env node --max_old_space_size=8192
require('dotenv').config()
const Keyv = require('keyv')
const bluebird = require('bluebird')
const {uniq, compact} = require('lodash')
const chalk = require('chalk')
const {expandMetaWithResults} = require('./lib/meta')
const {computeList} = require('./lib/sources')
const {processSource} = require('./lib/processing')
const mongo = require('./lib/util/mongo')
const {endFarms} = require('./lib/util/farms')

const db = new Keyv('sqlite://bal.sqlite')

async function main() {
  await mongo.connect()

  const sources = await computeList()

  await db.clear()

  const datasets = await bluebird.map(sources, async source => {
    const interval = setInterval(() => console.log(`processing ${source.meta.title}`), 60000)
    const {data, errored, report} = await processSource(source)

    if (data.length === 0) {
      clearInterval(interval)
      return
    }

    const codesCommunes = uniq(data.map(c => c.commune_insee))

    console.log(chalk.green(` * ${source.meta.title} (${source.meta.model})`))
    console.log(chalk.gray(`    Adresses trouvées : ${data.length}`))
    console.log(chalk.gray(`    Communes : ${codesCommunes.length}`))
    if (errored) {
      console.log(chalk.red(`    Lignes avec erreurs : ${errored}`))
    }

    expandMetaWithResults(source.meta, {data, report, errored})

    if (report) {
      await db.set(`${source.meta.id}-report`, report)
    }

    clearInterval(interval)
    return source.meta
  }, {concurrency: 8})

  await db.set('datasets', compact(datasets))

  endFarms()
  await mongo.disconnect()
}

main().catch(error => {
  console.error(error)
  endFarms()
  process.exit(1)
})
