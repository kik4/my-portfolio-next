export type Section = {
  id: string;
  title: string;
  items: Array<{
    pathname: string;
    title: string;
  }>;
};
