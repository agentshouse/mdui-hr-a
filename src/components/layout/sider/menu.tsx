import {useLocalList} from "@/hooks/use-local-data";
import type { ReactNode } from "react";
import { useMenu, } from "@refinedev/core";
import { Link } from "react-router";
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
} from "@mui/material";
import { TimeOffStatus } from "@/types";

export const Menu = () => {
  const { menuItems, selectedKey } = useMenu();

  return (
    <nav aria-label="resource list">
      <List
        sx={{
          paddingY: "24px",
        }}
      >
        {menuItems.filter((item) => item.route && !item.meta?.hide).map((item) => {
          const Item = item.identifier === "requests" ? RequestMenuItem : MenuItem;
          return <Item key={item.key} isSelected={selectedKey === item.key || selectedKey.includes(item.key)} icon={item.meta?.icon} route={item.route!} label={item.label} />;
        })}
      </List>
    </nav>
  );
};

type MenuItemProps = {
  isSelected: boolean;
  icon: ReactNode;
  route: string;
  label: string | undefined;
  rightSlot?: ReactNode;
};

const MenuItem = ({
  isSelected,
  icon,
  route,
  label,
  rightSlot,
}: MenuItemProps) => {
  return (
    <ListItem
      disablePadding
      sx={{
        borderRadius: "12px",
        bgcolor: isSelected ? "primary.50" : "transparent",

        "& .MuiListItemButton-root": {
          paddingTop: "0px",
          paddingBottom: "0px",
          paddingLeft: "12px",
          paddingRight: "8px",
          height: "40px",
          borderRadius: "12px",
        },

        "& .Mui-selected": {
          bgcolor: "unset",
        },

        "&:not(:last-child)": {
          marginBottom: "8px",
        },
      }}
    >
      <ListItemButton component={Link} to={route} selected={isSelected}>
        <ListItemIcon
          sx={{
            minWidth: "24px",
            color: isSelected ? "primary.main" : "text.secondary",
            strokeWidth: isSelected ? "1.5px" : "1px",
            "& svg > g": { strokeWidth: isSelected ? "1.5px" : "1px" },
          }}
        >
          {icon}
        </ListItemIcon>
        <ListItemText
          primary={label}
          primaryTypographyProps={{
            noWrap: true,
            color: isSelected ? "primary.700" : "text.primary",
            fontWeight: isSelected ? 600 : 400,
            fontSize: "14px",
            lineHeight: "24px",
          }}
        />
        {rightSlot}
      </ListItemButton>
    </ListItem>
  );
};

const RequestMenuItem = (props: MenuItemProps) => {
  const { result: timeOffsData } = useLocalList({
    resource: "time-offs",
    pagination: {
      // we need only the count of pending time-offs to show in the badge
      // so we can set the pageSize to 1 to reduce the data payload
      pageSize: 1,
    },
    filters: [
      { field: "status", operator: "eq", value: TimeOffStatus.PENDING },
    ],
  });

  const totalCount = timeOffsData?.total ?? 0;
  const hasCount = totalCount > 0;

  return (
    <MenuItem
      {...props}
      rightSlot={
        hasCount && (
          <Box
            sx={{
              padding: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minWidth: "24px",
              height: "24px",
              borderRadius: "4px",
              backgroundColor: (theme) => theme.palette.grey[100],
            }}
          >
            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
                fontSize: "12px",
                lineHeight: "16px",
              }}
            >
              {totalCount}
            </Typography>
          </Box>
        )
      }
    />
  );
};
