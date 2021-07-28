export enum ROUTES {
  RESTAPI_INIT = '/:wiki/init',
  RESTAPI_CREATE = '/:wiki/bags/:bag/tiddlers/:title',
  RESTAPI_READ = '/:wiki/bags/:bag/tiddlers/:title?',
  RESTAPI_UPDATE_DELETE = '/:wiki/bags/:bag/tiddlers/:title/revisions/:revision',
}