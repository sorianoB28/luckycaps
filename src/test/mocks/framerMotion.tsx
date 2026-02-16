import React from "react";

type DivProps = React.HTMLAttributes<HTMLDivElement> & {
  whileHover?: unknown;
};

export const motion = {
  div: ({ children, whileHover: _whileHover, ...rest }: DivProps) => (
    <div {...rest}>{children}</div>
  ),
};

