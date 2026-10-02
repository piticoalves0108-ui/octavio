/** Substituto de next/link: âncora com rota por "#". */
import { forwardRef, type AnchorHTMLAttributes } from "react";
import { paraHash } from "../spa/rotas";

type Props = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  prefetch?: boolean;
  replace?: boolean;
  scroll?: boolean;
};

const Link = forwardRef<HTMLAnchorElement, Props>(function Link({ href, prefetch, replace, scroll, ...props }, ref) {
  void prefetch;
  void replace;
  void scroll;
  return <a ref={ref} href={paraHash(href)} {...props} />;
});

export default Link;
