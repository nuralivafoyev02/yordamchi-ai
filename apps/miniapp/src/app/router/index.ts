import { createRouter, createWebHistory } from 'vue-router';
import HomePage from '../../pages/home/HomePage.vue';
import FinancePage from '../../pages/finance/FinancePage.vue';
import ProfilePage from '../../pages/profile/ProfilePage.vue';
import AdminPage from '../../pages/admin/AdminPage.vue';
import { useSessionStore } from '../stores/session';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { component: HomePage, path: '/' },
    { component: FinancePage, path: '/finance' },
    { component: ProfilePage, path: '/profile' },
    { component: AdminPage, path: '/admin' },
  ],
});

router.beforeEach((to) => {
  const sessionStore = useSessionStore();

  if (to.path === '/admin' && !['admin', 'owner'].includes(sessionStore.profile?.role ?? 'user')) {
    return '/profile';
  }

  return true;
});
