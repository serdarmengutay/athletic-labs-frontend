"use client";

import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import {
  Autocomplete,
  Avatar,
  Box,
  Button,
  Checkbox,
  CssBaseline,
  FormControl,
  InputLabel,
  Menu,
  MenuItem,
  Paper,
  Select,
  TextField,
  ThemeProvider,
  Typography,
} from "@mui/material";
import {
  DataGrid,
  GridColDef,
  GridColumnVisibilityModel,
  GridPaginationModel,
} from "@mui/x-data-grid";
import {
  Bell,
  Columns3,
  Download,
  Filter,
  ListFilter,
  RefreshCcw,
} from "lucide-react";
import { scoutingApi } from "@/lib/api";
import {
  ScoutingFilterOptions,
  ScoutingFilters,
  ScoutingPlayer,
} from "@/types/scouting";
import { ScoutingSidebar } from "@/components/scouting/ScoutingSidebar";
import { scoutingTheme } from "@/components/scouting/theme";

const defaultDraftFilters = {
  search: "",
  birthYears: [] as string[],
  gender: "",
  clubName: "",
  minHeight: "",
  maxHeight: "",
  minWeight: "",
  maxWeight: "",
  maxSprint30m: "",
  maxAgility: "",
  minFlexibility: "",
  minVerticalJump: "",
  minPassCount: "",
};

type DraftFilters = typeof defaultDraftFilters;

type ScoutingColumnConfigItem = {
  field: string;
  label: string;
  defaultVisible: boolean;
  lockVisible?: boolean;
  showInMenu?: boolean;
};

const SCOUTING_COLUMN_CONFIG: readonly ScoutingColumnConfigItem[] = [
  {
    field: "fullName",
    label: "Oyuncu",
    defaultVisible: true,
    lockVisible: true,
    showInMenu: false,
  },
  { field: "birthYear", label: "Doğum Tarihi", defaultVisible: true },
  { field: "height", label: "Boy (cm)", defaultVisible: true },
  { field: "weight", label: "Kilo (kg)", defaultVisible: true },
  { field: "bmi", label: "VKI", defaultVisible: true },
  { field: "flexibility", label: "Esneklik", defaultVisible: true },
  { field: "sprint30m", label: "30m", defaultVisible: true },
  { field: "sprint30mSecond", label: "İkinci 30 Metre", defaultVisible: true },
  { field: "agility", label: "Çeviklik", defaultVisible: true },
  { field: "verticalJump", label: "Sıçrama", defaultVisible: true },
  { field: "ffmi", label: "FFMI", defaultVisible: true },
  { field: "passCount", label: "Pas", defaultVisible: true },
  { field: "fatigueIndex", label: "Yorgunluk Endeksi", defaultVisible: true },
  { field: "updatedAt", label: "Son Güncelleme", defaultVisible: true },
];

const DEFAULT_COLUMN_VISIBILITY_MODEL = SCOUTING_COLUMN_CONFIG.reduce<GridColumnVisibilityModel>(
  (accumulator, column) => {
    accumulator[column.field] = column.defaultVisible;
    return accumulator;
  },
  {},
);

function getInitials(fullName: string): string {
  const words = fullName.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "AA";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0] ?? ""}${words[words.length - 1][0] ?? ""}`.toUpperCase();
}

function formatNumber(value: number | null, digits = 1): string {
  if (value === null || Number.isNaN(value)) return "-";
  return value.toFixed(digits);
}

function formatDate(value: string | null): string {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("tr-TR");
}

function calculateFFMI(heightCm: number | null, weightKg: number | null): number | null {
  if (!heightCm || !weightKg || heightCm <= 0 || weightKg <= 0) return null;
  const bodyFatPercent = 15;
  const heightM = heightCm / 100;
  const leanMass = weightKg * (1 - bodyFatPercent / 100);
  return Number((leanMass / (heightM * heightM)).toFixed(2));
}

function getPlayerFfmi(player: ScoutingPlayer): number | null {
  if (player.ffmi !== null && player.ffmi !== undefined) {
    return player.ffmi;
  }

  return calculateFFMI(player.height, player.weight);
}

function getCountryFlagSrc(countryCode: string | null | undefined): string {
  return `/flags/rounded/${(countryCode ?? "TR").trim().toLowerCase()}.svg`;
}

function getCountryClubLabel(player: ScoutingPlayer): string {
  const countryName = player.countryName?.trim() || "Türkiye";
  const clubName = player.clubName?.trim() || "Kulüp bilgisi yok";
  return `${countryName} - ${clubName}`;
}

function buildRequestFilters(
  draft: DraftFilters,
  pagination: GridPaginationModel,
  sortModel: { field: string; sort: "asc" | "desc" } | null
): ScoutingFilters {
  const asNumber = (value: string) =>
    value.trim() === "" ? undefined : Number(value);

  return {
    page: pagination.page + 1,
    pageSize: pagination.pageSize,
    search: draft.search.trim() || undefined,
    birthYears: (() => {
      const values = draft.birthYears
        .map((value) => asNumber(value))
        .filter((value): value is number => value !== undefined);
      return values.length > 0 ? values : undefined;
    })(),
    gender: draft.gender || undefined,
    clubName: draft.clubName.trim() || undefined,
    minHeight: asNumber(draft.minHeight),
    maxHeight: asNumber(draft.maxHeight),
    minWeight: asNumber(draft.minWeight),
    maxWeight: asNumber(draft.maxWeight),
    maxSprint30m: asNumber(draft.maxSprint30m),
    maxAgility: asNumber(draft.maxAgility),
    minFlexibility: asNumber(draft.minFlexibility),
    minVerticalJump: asNumber(draft.minVerticalJump),
    minPassCount: asNumber(draft.minPassCount),
    sortBy: sortModel?.field ?? "updatedAt",
    sortDirection: sortModel?.sort ?? "desc",
  };
}

export default function ScoutingPage() {
  const [players, setPlayers] = useState<ScoutingPlayer[]>([]);
  const [filterOptions, setFilterOptions] = useState<ScoutingFilterOptions | null>(
    null
  );
  const [draftFilters, setDraftFilters] = useState<DraftFilters>(defaultDraftFilters);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 20,
  });
  const [sortModel, setSortModel] = useState<{ field: string; sort: "asc" | "desc" } | null>({
    field: "updatedAt",
    sort: "desc",
  });
  const [rowCount, setRowCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [activeFilters, setActiveFilters] = useState<DraftFilters>(defaultDraftFilters);
  const [columnVisibilityModel, setColumnVisibilityModel] =
    useState<GridColumnVisibilityModel>(DEFAULT_COLUMN_VISIBILITY_MODEL);
  const [columnMenuAnchor, setColumnMenuAnchor] = useState<null | HTMLElement>(null);

  useEffect(() => {
    const loadFilters = async () => {
      try {
        const response = await scoutingApi.getFilterOptions();
        setFilterOptions(response.data.data);
      } catch (error) {
        console.error("Scouting filtreleri yüklenemedi:", error);
      }
    };

    loadFilters();
  }, []);

  useEffect(() => {
    const loadPlayers = async () => {
      try {
        setLoading(true);
        const filters = buildRequestFilters(
          activeFilters,
          paginationModel,
          sortModel
        );
        const response = await scoutingApi.getPlayers(filters);
        setPlayers(response.data.data.items);
        setRowCount(response.data.data.pagination.total);
      } catch (error) {
        console.error("Scouting oyuncuları yüklenemedi:", error);
      } finally {
        setLoading(false);
      }
    };

    loadPlayers();
  }, [activeFilters, paginationModel, sortModel]);

  const birthYearOptions = useMemo(() => {
    return (filterOptions?.birthYears ?? []).map((birthYear) => ({
      value: String(birthYear),
      label: String(birthYear),
    }));
  }, [filterOptions]);

  const columns = useMemo<GridColDef<ScoutingPlayer>[]>(
    () => [
      {
        field: "fullName",
        headerName: "Oyuncu",
        flex: 1.15,
        minWidth: 250,
        sortable: true,
        renderCell: ({ row }) => (
          <Box
            sx={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 1.25,
              py: 1,
            }}
          >
            <Avatar
              sx={{
                width: 34,
                height: 34,
                bgcolor: "#1d2935",
                color: "#4ade80",
                fontSize: 13,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {getInitials(row.fullName)}
            </Avatar>
            <Box
              sx={{
                minWidth: 0,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                gap: 0.2,
              }}
            >
              <Typography
                sx={{
                  color: "#f5f7fa",
                  fontWeight: 700,
                  fontSize: 15,
                  lineHeight: 1.15,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {row.fullName}
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, minWidth: 0 }}>
                <Box
                  component="img"
                  src={getCountryFlagSrc(row.countryCode)}
                  alt={row.countryName || "Türkiye"}
                  sx={{
                    width: 14,
                    height: 14,
                    borderRadius: "50%",
                    flexShrink: 0,
                  }}
                />
                <Typography
                  variant="caption"
                  sx={{
                    color: "#8c98a8",
                    lineHeight: 1.1,
                    fontSize: 12,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {getCountryClubLabel(row)}
                </Typography>
              </Box>
            </Box>
          </Box>
        ),
      },
      {
        field: "birthYear",
        headerName: "Doğum Tarihi",
        width: 112,
        sortable: true,
        align: "center",
        headerAlign: "center",
        renderCell: ({ value }) => String(value ?? "-"),
      },
      {
        field: "height",
        headerName: "Boy (cm)",
        width: 94,
        sortable: true,
        align: "center",
        headerAlign: "center",
        renderCell: ({ value }) => formatNumber(value as number | null, 0),
      },
      {
        field: "weight",
        headerName: "Kilo (kg)",
        width: 94,
        sortable: true,
        align: "center",
        headerAlign: "center",
        renderCell: ({ value }) => formatNumber(value as number | null, 0),
      },
      {
        field: "bmi",
        headerName: "VKI",
        width: 82,
        sortable: true,
        align: "center",
        headerAlign: "center",
        renderCell: ({ value }) => formatNumber(value as number | null, 1),
      },
      {
        field: "flexibility",
        headerName: "Esneklik",
        width: 95,
        sortable: true,
        align: "center",
        headerAlign: "center",
        renderCell: ({ value }) => formatNumber(value as number | null, 1),
      },
      {
        field: "sprint30m",
        headerName: "30m",
        width: 85,
        sortable: true,
        align: "center",
        headerAlign: "center",
        renderCell: ({ value }) => formatNumber(value as number | null, 2),
      },
      {
        field: "sprint30mSecond",
        headerName: "İkinci 30 Metre",
        width: 132,
        sortable: true,
        align: "center",
        headerAlign: "center",
        renderCell: ({ value }) => formatNumber(value as number | null, 2),
      },
      {
        field: "agility",
        headerName: "Çeviklik",
        width: 95,
        sortable: true,
        align: "center",
        headerAlign: "center",
        renderCell: ({ value }) => formatNumber(value as number | null, 2),
      },
      {
        field: "verticalJump",
        headerName: "Sıçrama",
        width: 94,
        sortable: true,
        align: "center",
        headerAlign: "center",
        renderCell: ({ value }) => formatNumber(value as number | null, 1),
      },
      {
        field: "ffmi",
        headerName: "FFMI",
        width: 86,
        sortable: false,
        align: "center",
        headerAlign: "center",
        renderCell: ({ row }) => formatNumber(getPlayerFfmi(row), 2),
      },
      {
        field: "passCount",
        headerName: "Pas",
        width: 80,
        sortable: true,
        align: "center",
        headerAlign: "center",
        renderCell: ({ value }) => formatNumber(value as number | null, 0),
      },
      {
        field: "fatigueIndex",
        headerName: "Yorgunluk Endeksi",
        width: 138,
        sortable: true,
        align: "center",
        headerAlign: "center",
        renderCell: ({ value }) => formatNumber(value as number | null, 2),
      },
      {
        field: "updatedAt",
        headerName: "Son Güncelleme",
        width: 126,
        sortable: true,
        align: "center",
        headerAlign: "center",
        renderCell: ({ value }) => formatDate(value as string | null),
      },
    ],
    []
  );

  const handleFilterChange = <K extends keyof DraftFilters>(
    key: K,
    value: DraftFilters[K],
  ) => {
    setDraftFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleApplyFilters = () => {
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
    setActiveFilters(draftFilters);
  };

  const handleClearFilters = () => {
    setDraftFilters(defaultDraftFilters);
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
    setActiveFilters(defaultDraftFilters);
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      const collected: ScoutingPlayer[] = [];
      let page = 1;
      let total = 0;

      do {
        const response = await scoutingApi.getPlayers({
          ...buildRequestFilters(activeFilters, { page: page - 1, pageSize: 100 }, sortModel),
          page,
          pageSize: 100,
        });

        const payload = response.data.data;
        total = payload.pagination.total;
        collected.push(...payload.items);
        page += 1;
      } while (collected.length < total);

      const rows = collected.map((player, index) => ({
        "#": index + 1,
        Oyuncu: player.fullName,
        "Doğum Tarihi": player.birthYear,
        Cinsiyet: player.gender === "female" ? "Kadın" : "Erkek",
        Uyruk: player.countryName || "Türkiye",
        Kulüp: player.clubName || "Kulüp bilgisi yok",
        "Boy (cm)": player.height,
        "Kilo (kg)": player.weight,
        VKI: player.bmi,
        Esneklik: player.flexibility,
        "30m Koşu": player.sprint30m,
        "İkinci 30m": player.sprint30mSecond,
        Çeviklik: player.agility,
        "Dikey Sıçrama": player.verticalJump,
        FFMI: getPlayerFfmi(player),
        Pas: player.passCount,
        "Yorgunluk İndeksi": player.fatigueIndex,
        "Son Güncelleme": formatDate(player.updatedAt),
      }));

      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Scouting");
      XLSX.writeFile(workbook, "athletic-labs-scouting-raporu.xlsx");
    } catch (error) {
      console.error("Scouting export başarısız:", error);
    } finally {
      setExporting(false);
    }
  };

  const handleToggleColumn = (field: string) => {
    const column = SCOUTING_COLUMN_CONFIG.find((item) => item.field === field);
    if (column?.lockVisible) return;

    setColumnVisibilityModel((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const dataGridSection = useMemo(
    () => (
      <Paper sx={{ p: 0, overflow: "hidden" }}>
        <DataGrid
          rows={players}
          columns={columns}
          getRowId={(row) => row.athleteTestId}
          autoHeight
          checkboxSelection
          disableRowSelectionOnClick
          rowHeight={64}
          columnHeaderHeight={58}
          paginationMode="server"
          sortingMode="server"
          rowCount={rowCount}
          loading={loading}
          columnVisibilityModel={columnVisibilityModel}
          onColumnVisibilityModelChange={setColumnVisibilityModel}
          onRowClick={(params, event) => {
            event.preventDefault();
            event.stopPropagation();
            event.defaultMuiPrevented = true;

            if (typeof window !== "undefined") {
              const url = new URL(
                `/scouting/${params.row.athleteTestId}`,
                window.location.origin,
              ).toString();
              const newTab = window.open(url, "_blank");

              if (newTab) {
                newTab.opener = null;
              }
            }
          }}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          pageSizeOptions={[10, 20, 50, 75, 100]}
          onSortModelChange={(model) => {
            const nextSort = model[0];
            if (!nextSort?.field || !nextSort.sort) {
              setSortModel({ field: "updatedAt", sort: "desc" });
              return;
            }
            setSortModel({
              field: nextSort.field,
              sort: nextSort.sort as "asc" | "desc",
            });
          }}
          initialState={{
            sorting: {
              sortModel: [{ field: "updatedAt", sort: "desc" }],
            },
          }}
          sx={{
            border: "none",
            "& .MuiDataGrid-columnHeaders": {
              borderBottom: "1px solid rgba(255,255,255,0.08)",
            },
            "& .MuiDataGrid-columnHeader": {
              px: 1.5,
            },
            "& .MuiDataGrid-cell": {
              borderBottom: "1px solid rgba(255,255,255,0.04)",
              px: 1.5,
              display: "flex",
              alignItems: "center",
            },
            "& .MuiDataGrid-columnHeaderTitle": {
              fontWeight: 700,
              fontSize: 13,
              letterSpacing: 0.1,
            },
            "& .MuiDataGrid-cellContent": {
              fontSize: 14,
              lineHeight: 1.2,
            },
            "& .MuiDataGrid-columnSeparator": {
              color: "rgba(255,255,255,0.08)",
            },
            "& .MuiDataGrid-footerContainer": {
              borderTop: "1px solid rgba(255,255,255,0.06)",
              minHeight: 58,
            },
          }}
        />
      </Paper>
    ),
    [
      players,
      columns,
      rowCount,
      loading,
      columnVisibilityModel,
      paginationModel,
    ],
  );

  return (
    <ThemeProvider theme={scoutingTheme}>
      <CssBaseline />
      <Box
        sx={{
          height: "100vh",
          background:
            "radial-gradient(circle at top left, rgba(74,222,128,0.10), transparent 22%), #0a0f14",
          color: "#f5f7fa",
          display: "flex",
          overflow: "hidden",
        }}
      >
        <ScoutingSidebar activeKey="players" />

        <Box sx={{ flex: 1, minWidth: 0, height: "100vh", overflowY: "auto" }}>
          <Box
            sx={{
              height: 72,
              px: { xs: 2, md: 4 },
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Bell size={18} color="#97a6b6" />
              <Typography sx={{ color: "#8c98a8", fontSize: 14 }}>
                Athletic Labs scouting ekranı
              </Typography>
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Avatar sx={{ bgcolor: "#1d2935", width: 36, height: 36 }}>AA</Avatar>
              <Box>
                <Typography sx={{ fontSize: 14, fontWeight: 700 }}>Athletic Labs</Typography>
                <Typography sx={{ fontSize: 12, color: "#8c98a8" }}>Scout</Typography>
              </Box>
            </Box>
          </Box>

          <Box sx={{ p: { xs: 2, md: 3 } }}>
            <Box
              sx={{
                mb: 2.5,
                display: "flex",
                flexDirection: { xs: "column", md: "row" },
                justifyContent: "space-between",
                gap: 2,
              }}
            >
              <Box>
                <Typography sx={{ fontSize: 36, fontWeight: 800, letterSpacing: -1 }}>
                  Oyuncu Listesi
                </Typography>
                <Typography sx={{ color: "#8c98a8", mt: 0.5 }}>
                  Tüm filtrelere uyan <Box component="span" sx={{ color: "#4ade80", fontWeight: 700 }}>{rowCount}</Box> sporcu bulundu.
                </Typography>
              </Box>

              <Box sx={{ display: "flex", gap: 1.25, flexWrap: "wrap" }}>
                <Button
                  variant="outlined"
                  startIcon={<Columns3 size={16} />}
                  onClick={(event) => setColumnMenuAnchor(event.currentTarget)}
                  sx={{
                    alignSelf: { xs: "stretch", md: "center" },
                    borderColor: "rgba(255,255,255,0.10)",
                    color: "#d5dce4",
                    px: 2,
                    py: 1.2,
                  }}
                >
                  Sütunlar
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<Download size={16} />}
                  onClick={handleExport}
                  disabled={exporting}
                  sx={{
                    alignSelf: { xs: "stretch", md: "center" },
                    borderColor: "rgba(255,255,255,0.10)",
                    color: "#d5dce4",
                    px: 2,
                    py: 1.2,
                  }}
                >
                  {exporting ? "Rapor hazırlanıyor" : "Raporu Dışa Aktar"}
                </Button>
              </Box>
            </Box>

            <Menu
              anchorEl={columnMenuAnchor}
              open={Boolean(columnMenuAnchor)}
              onClose={() => setColumnMenuAnchor(null)}
              slotProps={{
                paper: {
                  sx: {
                    mt: 1,
                    minWidth: 220,
                    backgroundColor: "#11181f",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 3,
                    p: 0.5,
                  },
                },
              }}
            >
              <Box sx={{ px: 1.5, py: 1 }}>
                <Typography sx={{ fontWeight: 700, fontSize: 13 }}>
                  Görünecek Sütunlar
                </Typography>
                <Typography sx={{ color: "#8c98a8", fontSize: 12, mt: 0.25 }}>
                  Varsayılan görünürlük tek config üzerinden yönetiliyor.
                </Typography>
              </Box>
              {SCOUTING_COLUMN_CONFIG.filter((column) => column.showInMenu !== false).map((column) => (
                <MenuItem
                  key={column.field}
                  onClick={() => handleToggleColumn(column.field)}
                  disabled={Boolean(column.lockVisible)}
                  sx={{
                    borderRadius: 2,
                    mx: 0.5,
                    minHeight: 40,
                    opacity: column.lockVisible ? 0.72 : 1,
                  }}
                >
                  <Checkbox
                    edge="start"
                    checked={Boolean(columnVisibilityModel[column.field])}
                    tabIndex={-1}
                    disableRipple
                    size="small"
                    sx={{ color: "#8c98a8" }}
                  />
                  <Box>
                    <Typography sx={{ fontSize: 14, fontWeight: 600 }}>
                      {column.label}
                    </Typography>
                    {column.lockVisible ? (
                      <Typography sx={{ fontSize: 11, color: "#8c98a8" }}>
                        Her zaman açık
                      </Typography>
                    ) : null}
                  </Box>
                </MenuItem>
              ))}
            </Menu>

            <Paper sx={{ p: 2.5, mb: 2.5 }}>
              <Box sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
                <ListFilter size={18} color="#4ade80" />
                <Typography sx={{ fontWeight: 700 }}>Scouting Filtreleri</Typography>
              </Box>

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    md: "repeat(2, minmax(0, 1fr))",
                    xl: "repeat(6, minmax(0, 1fr))",
                  },
                  gap: 2,
                }}
              >
                <TextField
                  label="Oyuncu Ara"
                  value={draftFilters.search}
                  onChange={(event) => handleFilterChange("search", event.target.value)}
                  placeholder="İsim ara"
                />

                <Autocomplete
                  freeSolo
                  options={filterOptions?.clubs ?? []}
                  value={draftFilters.clubName}
                  onInputChange={(_event, value) => handleFilterChange("clubName", value)}
                  renderInput={(params) => (
                    <TextField {...params} label="Kulüp Ara" placeholder="Kulüp ara" />
                  )}
                />

                <Autocomplete
                  multiple
                  options={birthYearOptions}
                  value={birthYearOptions.filter((option) =>
                    draftFilters.birthYears.includes(option.value),
                  )}
                  onChange={(_event, value) =>
                    handleFilterChange("birthYears", value.map((option) => option.value))
                  }
                  getOptionLabel={(option) => option.label}
                  isOptionEqualToValue={(option, value) => option.value === value.value}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Doğum Tarihi"
                      placeholder="Yıl seç"
                    />
                  )}
                />

                <FormControl>
                  <InputLabel>Cinsiyet</InputLabel>
                  <Select
                    label="Cinsiyet"
                    value={draftFilters.gender}
                    onChange={(event) =>
                      handleFilterChange("gender", String(event.target.value))
                    }
                  >
                    <MenuItem value="">Tümü</MenuItem>
                    {(filterOptions?.genders ?? []).map((gender) => (
                      <MenuItem key={gender} value={gender}>
                        {gender === "female" ? "Kadın" : "Erkek"}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <TextField
                  label="Min Boy"
                  type="number"
                  value={draftFilters.minHeight}
                  onChange={(event) => handleFilterChange("minHeight", event.target.value)}
                />
                <TextField
                  label="Max Boy"
                  type="number"
                  value={draftFilters.maxHeight}
                  onChange={(event) => handleFilterChange("maxHeight", event.target.value)}
                />
                <TextField
                  label="Max 30m"
                  type="number"
                  value={draftFilters.maxSprint30m}
                  onChange={(event) => handleFilterChange("maxSprint30m", event.target.value)}
                />

                <TextField
                  label="Min Kilo"
                  type="number"
                  value={draftFilters.minWeight}
                  onChange={(event) => handleFilterChange("minWeight", event.target.value)}
                />
                <TextField
                  label="Max Kilo"
                  type="number"
                  value={draftFilters.maxWeight}
                  onChange={(event) => handleFilterChange("maxWeight", event.target.value)}
                />
                <TextField
                  label="Max Çeviklik"
                  type="number"
                  value={draftFilters.maxAgility}
                  onChange={(event) => handleFilterChange("maxAgility", event.target.value)}
                />
                <TextField
                  label="Min Esneklik"
                  type="number"
                  value={draftFilters.minFlexibility}
                  onChange={(event) =>
                    handleFilterChange("minFlexibility", event.target.value)
                  }
                />
                <TextField
                  label="Min Sıçrama"
                  type="number"
                  value={draftFilters.minVerticalJump}
                  onChange={(event) =>
                    handleFilterChange("minVerticalJump", event.target.value)
                  }
                />
                <TextField
                  label="Min Pas"
                  type="number"
                  value={draftFilters.minPassCount}
                  onChange={(event) => handleFilterChange("minPassCount", event.target.value)}
                />
              </Box>

              <Box
                sx={{
                  mt: 2.5,
                  display: "flex",
                  flexDirection: { xs: "column", sm: "row" },
                  justifyContent: "flex-end",
                  gap: 1.5,
                }}
              >
                <Button
                  variant="outlined"
                  startIcon={<RefreshCcw size={16} />}
                  onClick={handleClearFilters}
                  sx={{ borderColor: "rgba(255,255,255,0.10)", color: "#c6d0db" }}
                >
                  Filtreleri Temizle
                </Button>
                <Button
                  variant="contained"
                  startIcon={<Filter size={16} />}
                  onClick={handleApplyFilters}
                  sx={{
                    background: "linear-gradient(135deg, #4ade80, #3ecf8e)",
                    color: "#091014",
                    fontWeight: 800,
                    "&:hover": {
                      background: "linear-gradient(135deg, #58e68a, #43d996)",
                    },
                  }}
                >
                  Filtrele
                </Button>
              </Box>
            </Paper>

            {dataGridSection}
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
}
