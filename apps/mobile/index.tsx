import 'react-native-url-polyfill/auto';
global.Buffer = require('buffer').Buffer;

import '@expo/metro-runtime';
import { renderRootComponent } from 'expo-router/build/renderRootComponent';
import { LogBox } from 'react-native';
import App from './App';

if (__DEV__) {
  LogBox.ignoreAllLogs();
}

renderRootComponent(App);
