import { createTheme } from "@mui/material";

export const scoutingTheme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#4ade80",
    },
    background: {
      default: "#0a0f14",
      paper: "#11181f",
    },
    text: {
      primary: "#f5f7fa",
      secondary: "#8c98a8",
    },
  },
  shape: {
    borderRadius: 14,
  },
  typography: {
    fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          border: "1px solid rgba(255,255,255,0.06)",
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: "#0f151c",
          color: "#f5f7fa",
          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: "rgba(255,255,255,0.08)",
          },
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: "rgba(255,255,255,0.18)",
          },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: "#4ade80",
          },
          "& input": {
            color: "#f5f7fa",
            WebkitTextFillColor: "#f5f7fa",
          },
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          color: "#8c98a8",
          "&.Mui-focused": {
            color: "#b8c4d2",
          },
        },
      },
    },
    MuiSvgIcon: {
      styleOverrides: {
        root: {
          color: "#c6d0db",
        },
      },
    },
  },
});
