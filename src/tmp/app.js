import moment from 'moment';
import {Utils} from '@natlibfi/melinda-commons';
import createClient from '@natlibfi/oai-pmh-client';
import createMatchInterface from '@natlibfi/melinda-record-matching';
import {MARCXML} from '@natlibfi/marc-record-serializers';
import {MarcRecord} from '@natlibfi/marc-record';
import {MongoClient} from 'mongodb';
import {mongoUri} from './config';

export default async ({logLevel, oaiPmhUrl, metadataPrefix, set, matchOptions}) => {
  MarcRecord.setValidationOptions({subfieldValues: false});

  const {createLogger} = Utils;
  const logger = createLogger(logLevel);
  const oaiPmhClient = createClient({url: oaiPmhUrl, metadataPrefix, set, retrieveAll: false, filterDeleted: true});
  const match = createMatchInterface(matchOptions);
  const {resumptionToken, status} = await readState();

  if (status === 'error') {
    logger.log('warn', 'Previous run crashed. Exiting...');
    return;
  }

  if (status === 'done') {
    logger.log('info', 'Harvest done. Exiting...');
    return;
  }

  // Temporary during development
  try {
    await harvest(resumptionToken);
  } catch (err) {
    const {client, db} = await initializeMongo();
    const stateDoc = {
      $set: {
        status: 'error',
        error: typeof err === 'object' && 'stack' in err ? err.stack : JSON.stringify(err),
        timestamp: moment().toDate()
      }
    };

    await db.collection('state').updateOne({}, stateDoc, {upsert: true});
    await client.close();
  }
  //return harvest(resumptionToken);

  async function readState() {
    const {client, db} = await initializeMongo();
    const state = await db.collection('state').findOne({});

    if (state === null) {
      await client.close();
      return {};
    }

    if (await hasInconsistentState()) { // eslint-disable-line functional/no-conditional-statement
      await client.close();
      throw new Error('State is inconsistent');
    }

    await client.close();
    return state;

    // Check if results with larger timestamp than state exists. if they do, remove them because process has ben interrupted
    async function hasInconsistentState() {
      const cursor = await db.collection('results').find({_id: {$gt: state.timestamp}});
      return cursor.count();
    }
  }


  async function initializeMongo() {
    const client = await MongoClient.connect(mongoUri, {useUnifiedTopology: true});
    return {client, db: client.db()};
  }

  async function harvest({token, cursor = 0} = {}) {
    logger.log('info', token ? `Continuing harvest. Cursor of last response ${cursor}` : 'Starting harvest');

    const {records, newToken} = await fetchRecords();
    const matchResults = await findMatches(records);

    await writeState();

    if (newToken) {      
      return harvest(newToken);
    }

    logger.log('info', 'Harvest done. Exiting...');

    function fetchRecords() {
      return new Promise((resolve, reject) => {
        const promises = [];
        const emitter = oaiPmhClient.listRecords({resumptionToken: {token}});

        emitter
          .on('error', reject)
          .on('end', async token => {
            try {
              const records = await Promise.all(promises);
              const newToken = formatToken();

              resolve({records, newToken});
            } catch (err) {
              reject(err);
            }

            function formatToken() {              
              return token ? {token: token.token, cursor: token.cursor} : undefined;
            }
          })
          .on('record', ({header: {identifier: id}, metadata}) => {
            promises.push((async () => { // eslint-disable-line functional/immutable-data
              try {
                const obj = await MARCXML.from(metadata);
                return {id, obj};
              } catch (err) {
                throw new Error(`Conversion of record ${id} failed: ${err.message}`);
              }
            })());
          });
      });
    }

    async function findMatches(records, results = [], count = 0) {
      const [record] = records;

      if (record) {
        const {id, obj} = record;
        logger.log('info', `Finding matches for record ${id} (Index ${cursor + count})`);

        const matchResults = await match(obj);

        if (matchResults.length > 0) {
          logger.log('info', 'Matches found!');
          const formatted = formatResults(obj, matchResults);
          return findMatches(records.slice(1), results.concat(formatted), count + 1);
        }

        return findMatches(records.slice(1), results, count + 1);
      }

      return results;

      function formatResults(record, matches) {
        return {
          input: record.toObject(),
          matches: matches.map(({candidate, propability}) => ({
            propability, candidate: candidate.toObject()
          }))
        };
      }
    }

    async function writeState() {
      const {client, db} = await initializeMongo();
      const stateDoc = generateDoc();

      await db.collection('state').updateOne({}, stateDoc, {upsert: true});

      if (matchResults.length > 0) {
        await db.collection('results').insertMany(matchResults);
        logger.log('debug', `Inserted ${matchResults.length} match results into database`);
        return client.close();
      }

      return client.close();

      function generateDoc() {
        if (newToken) {
          return {
            $set: {
              resumptionToken: newToken,
              timestamp: moment().toDate()
            }
          };
        }

        return {
          $set: {
            status: 'done',
            timestamp: moment().toDate()
          }
        };
      }
    }
  }
};


