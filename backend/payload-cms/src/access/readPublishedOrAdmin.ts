import type { Access } from 'payload';

export const readPublishedOrAdmin: Access = ({ req: { user } }) => {
  if (user?.role === 'admin') {
    return true;
  }

  return {
    status: {
      equals: 'published',
    },
  };
};
