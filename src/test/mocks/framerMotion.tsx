import React from "react";

type DivProps = React.HTMLAttributes<HTMLDivElement> & {
  whileHover?: unknown;
};

export const motion = {
  div: ({ children, whileHover, ...rest }: DivProps) => {
    void whileHover;
    return <div {...rest}>{children}</div>;
  },
};
