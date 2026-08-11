import { Route, Routes } from 'react-router-dom';

import { Layout } from './components/Layout';
import { ArticlePage } from './pages/ArticlePage';
import { CategoryPage } from './pages/CategoryPage';
import { CompanyPage } from './pages/CompanyPage';
import { ExplorePage } from './pages/ExplorePage';
import { HomePage } from './pages/HomePage';
import { LatestPage } from './pages/LatestPage';
import { NotFoundPage } from './pages/NotFoundPage';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="explore" element={<ExplorePage />} />
        <Route path="explore/:categoryKey" element={<CategoryPage />} />
        <Route path="c/:companyKey" element={<CompanyPage />} />
        <Route path="c/:companyKey/:documentId" element={<ArticlePage />} />
        <Route path="latest" element={<LatestPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
