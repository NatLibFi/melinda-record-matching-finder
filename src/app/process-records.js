
/**
*
* @licstart  The following is the entire license notice for the JavaScript code in this file.
*
* Melinda record dump exporter microservice
*
* Copyright (C) 2020 University Of Helsinki (The National Library Of Finland)
*
* This file is part of melinda-record-dump-exporter
*
* melinda-record-dump-exporter program is free software: you can redistribute it and/or modify
* it under the terms of the GNU Affero General Public License as
* published by the Free Software Foundation, either version 3 of the
* License, or (at your option) any later version.
*
* melinda-record-dump-exporter is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
* GNU Affero General Public License for more details.
*
* You should have received a copy of the GNU Affero General Public License
* along with this program.  If not, see <http://www.gnu.org/licenses/>.
*
* @licend  The above is the entire license notice
* for the JavaScript code in this file.
*
*/

import createMatchInterface, {candidateSearch} from '@natlibfi/melinda-record-matching';
import {MarcRecord} from '@natlibfi/marc-record';

export default ({logger, dbPool, matchOptions}) => {
  const match = createMatchInterface(matchOptions);

  return processRecords;

  async function processRecords() {
    const maxRecordsPerQuery = 1000;
    const connection = await dbPool.getConnection();

    logger.log('debug', 'Fetching records from the database');

    const records = await getRecords();
    await connection.end();

    if (records.length > 0) {
      await findMatches(records);
      return records.length < maxRecordsPerQuery ? undefined : processRecords();
    }

    async function getRecords() {
      const results = await connection.query('SELECT * FROM records ORDER BY id ASC LIMIT ?', [maxRecordsPerQuery]);
      return results.map(formatRecord);

      function formatRecord({id, record}) {
        return {
          id,
          record: new MarcRecord(record, {fields: false, subfields: false, subfieldValues: false})
        };
      }
    }

    async function findMatches(records) {
      const [recordResult] = records;

      if (recordResult) { // eslint-disable-line functional/no-conditional-statement
        const {id, record} = recordResult;

        logger.log('debug', `Finding matches for record ${id}`);

        try {
          await connection.beginTransaction();

          const matchResults = await match(record);

          if (matchResults.length > 0) {
            logger.log('info', `Matches found for record ${id}`);

            await connection.query('INSERT INTO results_records VALUES(?,?)', [id, record.toObject()]);
            await insertResults(id, matchResults);
            await connection.query('DELETE FROM records WHERE id = ?', [id]);
            await connection.commit();
            return findMatches(records.slice(1));
          }

          await connection.query('DELETE FROM records WHERE id = ?', [id]);
          await connection.commit();
          return findMatches(records.slice(1));
        } catch (err) {
          if (err instanceof candidateSearch.CandidateSearchError) {
            logger.log('warn', `Skipping record ${id}: ${err.message}`);
            await connection.query('DELETE FROM records WHERE id = ?', [id]);
            await connection.commit();
            return findMatches(records.slice(1));
          }

          await connection.rollback();
          throw err;
        }
      }

      async function insertResults(id, matches) {
        const [match] = matches;

        if (match) {
          const {candidate, probability} = match;
          await connection.query('INSERT INTO results_matches VALUES(?,?,?)', [id, probability, candidate.toObject()]);
          return insertResults(id, matches.slice(1));
        }
      }
    }
  }
};
