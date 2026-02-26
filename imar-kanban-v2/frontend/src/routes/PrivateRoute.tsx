// GEÇİCİ: Giriş ekranı devre dışı — PrivateRoute bypass edildi
// Aktif etmek için aşağıdaki yorum bloğunu geri aç ve bypass kısmını sil

// import { Navigate } from 'react-router-dom';
// import { Spin } from 'antd';
// import { useAuthStore } from '../stores/authStore';
//
// interface Props {
//   children: React.ReactNode;
// }
//
// export default function PrivateRoute({ children }: Props) {
//   const { token, initialized } = useAuthStore();
//
//   if (!initialized) {
//     return (
//       <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#1D2125' }}>
//         <Spin size="large" />
//       </div>
//     );
//   }
//
//   if (!token) {
//     return <Navigate to="/giris" replace />;
//   }
//
//   return <>{children}</>;
// }

interface Props {
  children: React.ReactNode;
}

export default function PrivateRoute({ children }: Props) {
  return <>{children}</>;
}
