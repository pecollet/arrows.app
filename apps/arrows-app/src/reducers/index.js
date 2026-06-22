import { combineReducers } from 'redux'
import recentStorage from "./recentStorage";
import storage from "./storage";
import diagramName from "./diagramName";
import graph from "./graph";
import selection from "./selection";
import mouse from "./mouse";
import guides from "./guides";
import applicationLayout from "./applicationLayout";
import viewTransformation from "./viewTransformation";
import gestures from "./gestures";
import actionMemos from "./actionMemos";
import applicationDialogs from "./applicationDialogs";
import gangs from './gangs'
import features from './features'
import googleDrive from "./googleDrive"
import cachedImages from "./cachedImages";
import prometheusData from "./prometheusData";
import bigQueryData from "./bigQueryData";
import prometheusSettings from "./prometheusSettings";

const arrowsApp = combineReducers({
  recentStorage,
  storage,
  diagramName,
  graph,
  selection,
  mouse,
  gestures,
  guides,
  applicationLayout,
  viewTransformation,
  actionMemos,
  applicationDialogs,
  gangs,
  features,
  googleDrive,
  cachedImages,
  prometheusData,
  bigQueryData,
  prometheusSettings
})

export default arrowsApp
