/**
*
* @licstart  The following is the entire license notice for the JavaScript code in this file.
*
* Harvester microservice of datastore dump system
*
* Copyright (C) 2020 University Of Helsinki (The National Library Of Finland)
*
* This file is part of datastore-dump-harvester
*
* datastore-dump-harvester program is free software: you can redistribute it and/or modify
* it under the terms of the GNU Affero General Public License as
* published by the Free Software Foundation, either version 3 of the
* License, or (at your option) any later version.
*
* datastore-dump-harvester is distributed in the hope that it will be useful,
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

import {Utils} from '@natlibfi/melinda-commons';
import {candidateSearch, matchDetection} from '@natlibfi/melinda-record-matching';

const {readEnvironmentVariable} = Utils;

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

export const logLevel = readEnvironmentVariable('LOG_LEVEL');
export const mongoUri = readEnvironmentVariable('MONGO_URI', {defaultValue: 'mongodb://localhost:27017/db'});

export const oaiPmhUrl = readEnvironmentVariable('OAI_PMH_URL');
export const metadataPrefix = readEnvironmentVariable('OAI_PMH_METADATA_PREFIX');
export const set = readEnvironmentVariable('OAI_PMH_SET', {defaultValue: ''});

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
