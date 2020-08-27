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

import {readEnvironmentVariable} from '@natlibfi/melinda-backend-commons';
import {candidateSearch, matchDetection} from '@natlibfi/melinda-record-matching';

const recordType = readEnvironmentVariable('RECORD_TYPE');

const bibSearchSpec = [
  candidateSearch.searchTypes.bib.hostComponents,
  candidateSearch.searchTypes.bib.standardIdentifiers,
  candidateSearch.searchTypes.bib.title
];

const bibStrategy = [
  matchDetection.features.bib.hostComponent(),
  matchDetection.features.bib.isbn(),
  matchDetection.features.bib.issn(),
  matchDetection.features.bib.otherStandardIdentifier(),
  matchDetection.features.bib.title(),
  matchDetection.features.bib.authors(),
  matchDetection.features.bib.recordType(),
  matchDetection.features.bib.publicationTime(),
  matchDetection.features.bib.language(),
  matchDetection.features.bib.bibliographicLevel()
];

export const logLevel = readEnvironmentVariable('LOG_LEVEL', {defaultValue: 'info'});

export const stateInterfaceOptions = {
  db: {
    host: readEnvironmentVariable('DATABASE_HOST', {defaultValue: 'localhost'}),
    port: readEnvironmentVariable('DATABASE_PORT', {defaultValue: 3306, format: v => Number(v)}),
    connectionLimit: readEnvironmentVariable('DATABASE_CONNECTION_LIMIT', {defaultValue: 5, format: v => Number(v)}),
    database: readEnvironmentVariable('DATABASE_NAME'),
    username: readEnvironmentVariable('DATABASE_USERNAME'),
    password: readEnvironmentVariable('DATABASE_PASSWORD')
  }
};

export const matchOptions = {
  maxMatches: readEnvironmentVariable('MAX_MATCHES', {defaultValue: 1, format: v => Number(v)}),
  maxCandidates: readEnvironmentVariable('MAX_CANDIDATES', {defaultValue: 25, format: v => Number(v)}),
  search: {
    url: readEnvironmentVariable('SRU_URL'),
    searchSpec: recordType === 'bib' ? bibSearchSpec : []
  },
  detection: {
    treshold: readEnvironmentVariable('MATCHING_TRESHOLD', {defaultValue: 0.9, format: v => Number(v)}),
    strategy: recordType === 'bib' ? bibStrategy : []
  }
};
