'use strict';

/**
 * solrPublish service
 */

module.exports = ({ env }) => ({
  solrServer: env('SOLR_SERVER', '127.0.0.1')


});
