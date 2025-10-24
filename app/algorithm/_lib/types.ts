export type Section = {
  id: string;
  title: string;
  items: Array<AlgorithmContent>;
};

export type AlgorithmContent = {
  slug: string;
  title: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  content: React.ReactNode;
};
