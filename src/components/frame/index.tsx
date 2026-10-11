import {
  Box,
  type BoxProps,
  Divider,
  Typography,
} from "@mui/material";
import type { PropsWithChildren, ReactNode } from "react";

type Props = PropsWithChildren<{
  title?: string;
  titleSuffix?: ReactNode;
  showHeaderBorder?: boolean;
  icon?: ReactNode;
  sx?: BoxProps["sx"];
  sxChildren?: BoxProps["sx"];
}>;

export const Frame = ({
  children,
  icon,
  title,
  titleSuffix,
  sx,
  sxChildren,
  showHeaderBorder,
}: Props) => {
  return (
    <Box
      sx={[
        { border: "1px solid", borderColor: "divider", borderRadius: "12px", height: "100%", paddingBottom: "24px" },
        ...(Array.isArray(sx) ? sx : [sx ?? {}]),
      ]}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "24px",
          height: "72px",
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <Typography
            variant="h2"
            sx={{
              fontSize: "16px",
              lineHeight: "24px",
              fontWeight: 500,
            }}
          >
            {title}
          </Typography>
          {titleSuffix}
        </Box>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "grey.500",
          }}
        >
          {icon}
        </Box>
      </Box>
      {showHeaderBorder && (
        <Divider
          sx={{
            marginBottom: "24px",
          }}
        />
      )}
      <Box
        sx={[
          { paddingLeft: "24px", paddingRight: "24px" },
          ...(Array.isArray(sxChildren) ? sxChildren : [sxChildren ?? {}]),
        ]}
      >
        {children}
      </Box>
    </Box>
  );
};
