import { createApp } from 'vue';
import Varlet, { Input } from '@varlet/ui';
import '@varlet/ui/es/style';
import './style.css';
import App from './App.vue';

createApp(App).use(Varlet).mount('#app');
