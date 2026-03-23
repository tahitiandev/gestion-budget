import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import 'firebase/compat/auth';
import { firebaseConfig } from '../../environments/firebase.config';

const app = firebase.initializeApp(firebaseConfig);
export const db = app.firestore();
export const auth = app.auth();
