export type Section = {
  id: string;
  title: string;
  items: Array<{
    slug: string;
    title: string;
  }>;
};
