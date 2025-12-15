"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SimpleMenu, SimpleMenuItem } from "@/components/ui/simple-menu"
import { toast } from "@/components/ui/use-toast"
import { useAuth } from "@/lib/use-auth"
import { ErrorBoundary } from "./error-boundary"
import {
  ArrowLeft,
  Plus,
  MoreVertical,
  Copy,
  Trash,
  Edit,
  Search,
  Eye,
  X,
  LayoutTemplate,
  Grid3x3,
  LayoutGrid,
  Trash2,
} from "lucide-react"
import { DeleteConfirmationDialog } from "@/components/delete-confirmation-dialog"
import { TemplateSelectionDialog } from "./template-selection-dialog"
import { CreateTemplateDialog } from "./create-template-dialog"
import { CreateSubRoomDialog } from "./create-sub-room-dialog"
import type { RoomTemplate } from "@/components/room-templates"
import { RoomVisualization } from "./room-visualization"

interface Room {
  id: string
  establishment_id: string
  name: string
  code: string
  board_position: "top" | "bottom" | "left" | "right"
  config: {
    columns: {
      id: string
      tables: number
      seatsPerTable: number
    }[]
  }
  created_by: string | null
  created_at: string
  updated_at: string
}

interface RoomsManagementProps {
  rooms?: Room[]
  establishmentId: string
  userRole?: string
  userId?: string
  onBack?: () => void
}

export function RoomsManagement({ rooms, establishmentId, userRole, userId, onBack }: RoomsManagementProps) {
  const supabase = createClient()
  const router = useRouter()
  const { user } = useAuth()

  const [localRooms, setLocalRooms] = useState<Room[]>(rooms || [])
  const [filteredRooms, setFilteredRooms] = useState<Room[]>(rooms || [])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([])
  const [viewedRoom, setViewedRoom] = useState<Room | null>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [roomsToDelete, setRoomsToDelete] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [editingRoom, setEditingRoom] = useState<Room | null>(null)
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false)
  const [isCreateTemplateDialogOpen, setIsCreateTemplateDialogOpen] = useState(false)
  const [creationMode, setCreationMode] = useState<"template" | "custom" | null>(null)
  const [isCreateSubRoomDialogOpen, setIsCreateSubRoomDialogOpen] = useState(false)
  const [preselectedRoomId, setPreselectedRoomId] = useState<string | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false) // For template selection dialog

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    boardPosition: "top" as "top" | "bottom" | "left" | "right",
    columns: [
      { id: "col1", tables: 5, seatsPerTable: 2 },
      { id: "col2", tables: 5, seatsPerTable: 2 },
      { id: "col3", tables: 4, seatsPerTable: 2 },
    ],
  })

  // Renamed to match dialog state
  const showCreateTemplateDialog = isCreateTemplateDialogOpen
  const showTemplatesDialog = isTemplateDialogOpen

  const effectiveUserRole = userRole || user?.role || "professeur"
  const effectiveUserId = userId || user?.id
  const isVieScolaire = effectiveUserRole === "vie_scolaire"
  const isDelegate = effectiveUserRole === "delegue_adjoint"
  const isTeacher = effectiveUserRole === "professeur"

  const canModifyRooms = userRole === "professeur" || userRole === "vie-scolaire" || userRole === "admin"

  console.log("[v0] RoomsManagement - Permissions:", {
    userRole: effectiveUserRole,
    userId: effectiveUserId,
    isTeacher,
    canModifyRooms,
  })

  useEffect(() => {
    fetchRooms()
  }, [establishmentId])

  async function fetchRooms() {
    const { data, error } = await supabase
      .from("rooms")
      .select("*")
      .eq("establishment_id", establishmentId)
      .order("name")

    if (error) {
      console.error("[v0] Error fetching rooms:", error)
      toast({
        title: "Erreur",
        description: "Impossible de charger les salles",
        variant: "destructive",
      })
    } else {
      console.log("[v0] Fetched rooms:", data?.length || 0)
      setLocalRooms(data || [])
      setFilteredRooms(data || []) // Ensure filteredRooms is also updated
    }
  }

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredRooms(localRooms)
    } else {
      const query = searchQuery.toLowerCase()
      setFilteredRooms(
        localRooms.filter((room) => room.name.toLowerCase().includes(query) || room.code.toLowerCase().includes(query)),
      )
    }
  }, [searchQuery, localRooms]) // Depend on localRooms now

  const handleAddColumn = () => {
    if (formData.columns.length >= 4) {
      toast({
        title: "Limite atteinte",
        description: "Vous ne pouvez pas ajouter plus de 4 colonnes",
        variant: "destructive",
      })
      return
    }

    setFormData({
      ...formData,
      columns: [...formData.columns, { id: `col${formData.columns.length + 1}`, tables: 5, seatsPerTable: 2 }],
    })
  }

  const handleRemoveColumn = (index: number) => {
    if (formData.columns.length <= 1) {
      toast({
        title: "Action impossible",
        description: "Vous devez avoir au moins une colonne",
        variant: "destructive",
      })
      return
    }

    setFormData({
      ...formData,
      columns: formData.columns.filter((_, i) => i !== index),
    })
  }

  const handleColumnChange = (index: number, field: "tables" | "seatsPerTable", value: number) => {
    const newColumns = [...formData.columns]
    newColumns[index] = { ...newColumns[index], [field]: value }
    setFormData({ ...formData, columns: newColumns })
  }

  const calculateTotalSeats = () => {
    if (!formData?.columns || !Array.isArray(formData.columns)) return 0

    return formData.columns.reduce((total, column) => {
      if (!column || typeof column !== "object") return total
      const tables = Number(column.tables) || 0
      const seatsPerTable = Number(column.seatsPerTable) || 0
      return total + tables * seatsPerTable
    }, 0)
  }

  const calculateTotalWidth = () => {
    if (!formData?.columns || !Array.isArray(formData.columns)) return 0

    return formData.columns.reduce((total, column) => {
      if (!column || typeof column !== "object") return total
      const seatsPerTable = Number(column.seatsPerTable) || 0
      return total + seatsPerTable
    }, 0)
  }

  const handleAddRoom = async () => {
    if (!formData.name.trim() || !formData.code.trim()) {
      toast({
        title: "Champs requis",
        description: "Le nom et le code de la salle sont requis",
        variant: "destructive",
      })
      return
    }

    const totalSeats = calculateTotalSeats()
    if (totalSeats > 350) {
      toast({
        title: "Limite dépassée",
        description: "Une salle ne peut pas contenir plus de 350 places",
        variant: "destructive",
      })
      return
    }

    const totalWidth = calculateTotalWidth()
    if (totalWidth > 15) {
      // Augmentation de la largeur maximale à 15
      toast({
        title: "Largeur excessive",
        description: "La largeur totale ne peut pas dépasser 15 places",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      const { data, error } = await supabase
        .from("rooms")
        .insert({
          establishment_id: establishmentId,
          name: formData.name,
          code: formData.code,
          board_position: formData.boardPosition,
          config: { columns: formData.columns },
          created_by: effectiveUserId,
        })
        .select()
        .single()

      if (error) throw error

      toast({
        title: "Succès",
        description: "Salle créée avec succès",
      })

      setIsAddDialogOpen(false)
      fetchRooms()

      setFormData({
        name: "",
        code: "",
        boardPosition: "top",
        columns: [
          { id: "col1", tables: 5, seatsPerTable: 2 },
          { id: "col2", tables: 5, seatsPerTable: 2 },
          { id: "col3", tables: 4, seatsPerTable: 2 },
        ],
      })
    } catch (error: any) {
      console.error("[v0] Error creating room:", error)
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer la salle",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleEditRoom = async () => {
    if (!editingRoom || !formData.name.trim() || !formData.code.trim()) {
      toast({
        title: "Champs requis",
        description: "Le nom et le code de la salle sont requis",
        variant: "destructive",
      })
      return
    }

    const totalSeats = calculateTotalSeats()
    if (totalSeats > 350) {
      toast({
        title: "Limite dépassée",
        description: "Une salle ne peut pas contenir plus de 350 places",
        variant: "destructive",
      })
      return
    }

    const totalWidth = calculateTotalWidth()
    if (totalWidth > 15) {
      // Augmentation de la largeur maximale à 15
      toast({
        title: "Largeur excessive",
        description: "La largeur totale ne peut pas dépasser 15 places",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      const { error } = await supabase
        .from("rooms")
        .update({
          name: formData.name,
          code: formData.code,
          board_position: formData.boardPosition,
          config: { columns: formData.columns },
        })
        .eq("id", editingRoom.id)

      if (error) throw error

      toast({
        title: "Succès",
        description: "Salle modifiée avec succès",
      })

      setIsEditDialogOpen(false)
      setEditingRoom(null)
      fetchRooms()

      if (viewedRoom?.id === editingRoom.id) {
        const updatedRoom = {
          ...editingRoom,
          name: formData.name,
          code: formData.code,
          board_position: formData.boardPosition,
          config: { columns: formData.columns },
        }
        setViewedRoom(updatedRoom)
      }
    } catch (error: any) {
      console.error("[v0] Error updating room:", error)
      toast({
        title: "Erreur",
        description: error.message || "Impossible de modifier la salle",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDuplicateRooms = async (roomIds: string[]) => {
    setIsLoading(true)

    try {
      const roomsToDuplicate = localRooms.filter((room) => roomIds.includes(room.id))

      for (const room of roomsToDuplicate) {
        const { error } = await supabase.from("rooms").insert({
          establishment_id: room.establishment_id,
          name: `${room.name} (copie)`,
          code: `${room.code}-COPY`,
          board_position: room.board_position,
          config: room.config,
          created_by: effectiveUserId,
        })

        if (error) throw error
      }

      toast({
        title: "Succès",
        description: `${roomIds.length} salle(s) dupliquée(s) avec succès`,
      })

      fetchRooms()
      setSelectedRoomIds([])
    } catch (error: any) {
      console.error("[v0] Error duplicating rooms:", error)
      toast({
        title: "Erreur",
        description: error.message || "Impossible de dupliquer les salles",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteRooms = async () => {
    setIsLoading(true)

    try {
      const { error } = await supabase.from("rooms").delete().in("id", roomsToDelete)

      if (error) throw error

      toast({
        title: "Succès",
        description: `${roomsToDelete.length} salle(s) supprimée(s) avec succès`,
      })

      if (viewedRoom && roomsToDelete.includes(viewedRoom.id)) {
        setViewedRoom(null)
      }

      fetchRooms()
      setSelectedRoomIds([])
      setIsDeleteDialogOpen(false)
      setRoomsToDelete([])
    } catch (error: any) {
      console.error("[v0] Error deleting rooms:", error)
      toast({
        title: "Erreur",
        description: error.message || "Impossible de supprimer les salles",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const openEditDialog = (room: Room) => {
    setEditingRoom(room)
    setFormData({
      name: room.name,
      code: room.code,
      boardPosition: room.board_position,
      columns: room.config.columns,
    })
    setIsEditDialogOpen(true)
  }

  const openDeleteDialog = (roomIds: string[]) => {
    setRoomsToDelete(roomIds)
    setIsDeleteDialogOpen(true)
  }

  const handleViewRoom = (room: Room) => {
    console.log("[v0] handleViewRoom called with:", {
      roomId: room.id,
      roomName: room.name,
      hasConfig: !!room.config,
      columnsCount: room.config?.columns?.length,
    })
    setViewedRoom(room)
  }

  const toggleRoomSelection = (roomId: string) => {
    setSelectedRoomIds((prev) => (prev.includes(roomId) ? prev.filter((id) => id !== roomId) : [...prev, roomId]))
  }

  const toggleSelectAll = () => {
    if (selectedRoomIds.length === filteredRooms.length) {
      setSelectedRoomIds([])
    } else {
      setSelectedRoomIds(filteredRooms.map((room) => room.id))
    }
  }

  const handleCustomCreation = () => {
    setCreationMode("custom")
    setIsAddDialogOpen(true)
  }

  const handleTemplateSelect = (template: RoomTemplate) => {
    setFormData({
      name: template.name,
      code: template.code || "",
      boardPosition: template.config.boardPosition || "top",
      columns: template.config.columns,
    })
    setCreationMode("template")
    setIsTemplateDialogOpen(false)
    setIsAddDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      <ErrorBoundary
        componentName="Page des salles"
        fallback={
          <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
            <CardContent className="p-6">
              <div className="text-center">
                <h2 className="text-xl font-bold text-red-700 dark:text-red-300 mb-2">
                  Erreur de chargement de la page
                </h2>
                <p className="text-red-600 dark:text-red-400 mb-4">
                  Une erreur s'est produite lors du chargement de la gestion des salles.
                </p>
                <Button onClick={() => window.location.reload()} variant="outline">
                  Recharger la page
                </Button>
              </div>
            </CardContent>
          </Card>
        }
      >
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => (onBack ? onBack() : router.back())}
              className="hover:bg-white/50 dark:hover:bg-slate-800/50"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                Gestion des salles
              </h1>
              <p className="text-muted-foreground mt-1">
                {localRooms.length} salle{localRooms.length > 1 ? "s" : ""} • {filteredRooms.length} affichée
                {filteredRooms.length > 1 ? "s" : ""}
              </p>
            </div>
          </div>
          {canModifyRooms && (
            <div className="flex gap-3">
              <Button
                onClick={() => setIsTemplateDialogOpen(true)}
                size="lg"
                variant="outline"
                className="border-emerald-300 hover:bg-emerald-50 hover:border-emerald-400 dark:border-emerald-700 dark:hover:bg-emerald-900/20"
              >
                <LayoutTemplate className="mr-2 h-5 w-5" />
                Templates
              </Button>
              <Button
                onClick={handleCustomCreation}
                size="lg"
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg"
              >
                <Plus className="mr-2 h-5 w-5" />
                Nouvelle salle
              </Button>
            </div>
          )}
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom ou code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-12 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2"
              onClick={() => setSearchQuery("")}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <Card className="mb-6 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950 dark:to-teal-950 border-emerald-200 dark:border-emerald-800">
          <CardHeader>
            <CardTitle className="text-emerald-900 dark:text-emerald-100">Créer une nouvelle salle</CardTitle>
            <CardDescription className="text-emerald-700 dark:text-emerald-300">
              Choisissez comment créer votre salle
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button
                onClick={() => setIsCreateTemplateDialogOpen(true)}
                variant="outline"
                className="flex-1 h-20 border-2 border-emerald-300 dark:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
              >
                <Plus className="mr-2 h-5 w-5" />
                Créer un template
              </Button>
              <Button
                onClick={() => setIsTemplateDialogOpen(true)}
                variant="outline"
                className="flex-1 h-20 border-2 border-emerald-300 dark:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
              >
                <Grid3x3 className="mr-2 h-5 w-5" />
                Templates
              </Button>
              <Button
                onClick={handleCustomCreation}
                className="flex-1 h-20 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg"
              >
                <LayoutGrid className="mr-2 h-5 w-5" />
                Personnalisée
              </Button>
            </div>
          </CardContent>
        </Card>

        {canModifyRooms && (
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="select-all"
                checked={selectedRoomIds.length === filteredRooms.length && filteredRooms.length > 0}
                onCheckedChange={toggleSelectAll}
              />
              <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                Tout sélectionner ({filteredRooms.length})
              </label>
            </div>

            {selectedRoomIds.length > 0 && canModifyRooms && (
              <div className="flex gap-2 items-center animate-in slide-in-from-right duration-300">
                <span className="text-sm text-muted-foreground">{selectedRoomIds.length} sélectionnée(s)</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDuplicateRooms(selectedRoomIds)}
                  className="border-blue-300 text-blue-700 hover:bg-blue-50 dark:hover:bg-emerald-900/20"
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Dupliquer ({selectedRoomIds.length})
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openDeleteDialog(selectedRoomIds)}
                  className="border-red-300 text-red-700 hover:bg-red-50 bg-transparent"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Supprimer ({selectedRoomIds.length})
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Grille des salles */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredRooms.map((room) => {
            const columns = room.config?.columns
            const safeColumns = Array.isArray(columns) ? columns : []
            const totalSeats = safeColumns.reduce((acc, col) => acc + (col?.tables || 0) * (col?.seatsPerTable || 0), 0)

            return (
              <Card
                key={room.id}
                className="group relative bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200 dark:border-slate-700 hover:shadow-xl hover:border-emerald-300 dark:hover:border-emerald-700 transition-all duration-300 cursor-pointer overflow-hidden"
                onClick={() => handleViewRoom(room)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    {canModifyRooms && (
                      <Checkbox
                        checked={selectedRoomIds.includes(room.id)}
                        onCheckedChange={() => toggleRoomSelection(room.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-1"
                      />
                    )}
                    <div className="flex-1" />
                    <SimpleMenu
                      align="end"
                      trigger={
                        <button
                          type="button"
                          className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 hover:bg-accent hover:text-accent-foreground"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="h-4 w-4" />
                          <span className="sr-only">Menu</span>
                        </button>
                      }
                    >
                      <SimpleMenuItem
                        onClick={(e) => {
                          e.stopPropagation()
                          handleViewRoom(room)
                        }}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        Voir
                      </SimpleMenuItem>
                      <SimpleMenuItem
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDuplicateRooms([room.id])
                        }}
                      >
                        <Copy className="mr-2 h-4 w-4" />
                        Dupliquer
                      </SimpleMenuItem>
                      <SimpleMenuItem
                        onClick={(e) => {
                          e.stopPropagation()
                          openEditDialog(room)
                        }}
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Modifier
                      </SimpleMenuItem>
                      <SimpleMenuItem
                        destructive
                        onClick={(e) => {
                          e.stopPropagation()
                          openDeleteDialog([room.id])
                        }}
                      >
                        <Trash className="mr-2 h-4 w-4" />
                        Supprimer
                      </SimpleMenuItem>
                    </SimpleMenu>
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white">{room.name}</h3>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                        {room.code}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {safeColumns.length} col. • {totalSeats} places
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-4 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 dark:border-emerald-800 dark:hover:bg-emerald-900/20 bg-transparent"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleViewRoom(room)
                    }}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    Visualiser
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {filteredRooms.length === 0 && (
          <Card className="text-center p-12 bg-slate-50 dark:bg-slate-900 border-dashed">
            <CardContent>
              <div className="flex flex-col items-center gap-4">
                <div className="w-20 h-20 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
                  <Search className="h-10 w-10 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">
                    {searchQuery ? "Aucune salle trouvée" : "Aucune salle"}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {searchQuery ? "Essayez une autre recherche" : "Commencez par créer votre première salle"}
                  </p>
                </div>
              </div>
              {canModifyRooms && !searchQuery && (
                <Button
                  onClick={handleCustomCreation}
                  className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Créer une salle
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {viewedRoom && (
          <Dialog open={!!viewedRoom} onOpenChange={(open) => !open && setViewedRoom(null)}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{viewedRoom.name}</DialogTitle>
                <DialogDescription>Code: {viewedRoom.code}</DialogDescription>
              </DialogHeader>
              <div className="py-4">
                {viewedRoom.config &&
                viewedRoom.config.columns &&
                Array.isArray(viewedRoom.config.columns) &&
                viewedRoom.config.columns.length > 0 ? (
                  <RoomVisualization room={viewedRoom} />
                ) : (
                  <div className="text-center py-8 text-muted-foreground">Configuration de salle non disponible</div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setViewedRoom(null)}>
                  Fermer
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {creationMode === "template" ? "Créer à partir d'un template" : "Créer une nouvelle salle"}
              </DialogTitle>
              <DialogDescription>
                Configurez votre nouvelle salle. Vous pouvez ajouter jusqu'à 4 colonnes et 350 places maximum.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Nom de la salle *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Salle 101"
                  />
                </div>
                <div>
                  <Label htmlFor="code">Code *</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="S101"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="boardPosition">Position du tableau</Label>
                <Select
                  value={formData.boardPosition}
                  onValueChange={(value: any) => setFormData({ ...formData, boardPosition: value })}
                >
                  <SelectTrigger id="boardPosition">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="top">En haut</SelectItem>
                    <SelectItem value="bottom">En bas</SelectItem>
                    <SelectItem value="left">À gauche</SelectItem>
                    <SelectItem value="right">À droite</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="mb-4 block">Configuration des colonnes</Label>
                <div className="space-y-4">
                  {formData.columns.map((column, index) => (
                    <div
                      key={column.id}
                      className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg"
                    >
                      <div className="flex-1">
                        <Label htmlFor={`tables-${index}`} className="text-xs">
                          Tables
                        </Label>
                        <Input
                          id={`tables-${index}`}
                          type="number"
                          min="1"
                          max="15" // Max tables per column updated to 15
                          value={column.tables}
                          onChange={(e) => handleColumnChange(index, "tables", Number.parseInt(e.target.value) || 0)}
                        />
                      </div>
                      <div className="flex-1">
                        <Label htmlFor={`seatsPerTable-${index}`} className="text-xs">
                          Places/table
                        </Label>
                        <Input
                          id={`seatsPerTable-${index}`}
                          type="number"
                          min="1"
                          max="4" // Max seats per table updated to 4
                          value={column.seatsPerTable}
                          onChange={(e) =>
                            handleColumnChange(index, "seatsPerTable", Number.parseInt(e.target.value) || 0)
                          }
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {column.tables * column.seatsPerTable} places
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveColumn(index)}
                          disabled={formData.columns.length <= 1}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  <Button variant="outline" onClick={handleAddColumn} disabled={formData.columns.length >= 4}>
                    <Plus className="mr-2 h-4 w-4" />
                    Ajouter une colonne
                  </Button>
                </div>
              </div>

              <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Total de places:</span>
                  <span className="text-emerald-700 dark:text-emerald-400 font-bold text-lg">
                    {calculateTotalSeats()} / 350
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm mt-2">
                  <span className="font-medium">Largeur totale:</span>
                  <span className="text-emerald-700 dark:text-emerald-400 font-bold text-lg">
                    {calculateTotalWidth()} / 15
                  </span>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleAddRoom} disabled={isLoading}>
                {isLoading ? "Création..." : "Créer"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Modifier la salle</DialogTitle>
              <DialogDescription>
                Modifiez la configuration de votre salle. Jusqu'à 4 colonnes et 350 places maximum.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-name">Nom de la salle *</Label>
                  <Input
                    id="edit-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Salle 101"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-code">Code *</Label>
                  <Input
                    id="edit-code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="S101"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="edit-boardPosition">Position du tableau</Label>
                <Select
                  value={formData.boardPosition}
                  onValueChange={(value: any) => setFormData({ ...formData, boardPosition: value })}
                >
                  <SelectTrigger id="edit-boardPosition">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="top">En haut</SelectItem>
                    <SelectItem value="bottom">En bas</SelectItem>
                    <SelectItem value="left">À gauche</SelectItem>
                    <SelectItem value="right">À droite</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="mb-4 block">Configuration des colonnes</Label>
                <div className="space-y-4">
                  {formData.columns.map((column, index) => (
                    <div
                      key={column.id}
                      className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg"
                    >
                      <div className="flex-1">
                        <Label htmlFor={`edit-tables-${index}`} className="text-xs">
                          Tables
                        </Label>
                        <Input
                          id={`edit-tables-${index}`}
                          type="number"
                          min="1"
                          max="15" // Max tables per column updated to 15
                          value={column.tables}
                          onChange={(e) => handleColumnChange(index, "tables", Number.parseInt(e.target.value) || 0)}
                        />
                      </div>
                      <div className="flex-1">
                        <Label htmlFor={`edit-seatsPerTable-${index}`} className="text-xs">
                          Places/table
                        </Label>
                        <Input
                          id={`edit-seatsPerTable-${index}`}
                          type="number"
                          min="1"
                          max="4" // Max seats per table updated to 4
                          value={column.seatsPerTable}
                          onChange={(e) =>
                            handleColumnChange(index, "seatsPerTable", Number.parseInt(e.target.value) || 0)
                          }
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {column.tables * column.seatsPerTable} places
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveColumn(index)}
                          disabled={formData.columns.length <= 1}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  <Button variant="outline" onClick={handleAddColumn} disabled={formData.columns.length >= 4}>
                    <Plus className="mr-2 h-4 w-4" />
                    Ajouter une colonne
                  </Button>
                </div>
              </div>

              <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Total de places:</span>
                  <span className="text-emerald-700 dark:text-emerald-400 font-bold text-lg">
                    {calculateTotalSeats()} / 350
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm mt-2">
                  <span className="font-medium">Largeur totale:</span>
                  <span className="text-emerald-700 dark:text-emerald-400 font-bold text-lg">
                    {calculateTotalWidth()} / 15
                  </span>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleEditRoom} disabled={isLoading}>
                {isLoading ? "Modification..." : "Enregistrer"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <DeleteConfirmationDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
          onConfirm={handleDeleteRooms}
          title="Supprimer les salles"
          description={`Êtes-vous sûr de vouloir supprimer ${roomsToDelete.length} salle(s) ? Cette action est irréversible.`}
        />

        <TemplateSelectionDialog
          open={isTemplateDialogOpen}
          onOpenChange={setIsTemplateDialogOpen}
          onSelectTemplate={handleTemplateSelect}
        />

        <CreateTemplateDialog
          open={isCreateTemplateDialogOpen}
          onOpenChange={setIsCreateTemplateDialogOpen}
          establishmentId={establishmentId}
          onSuccess={fetchRooms}
        />

        <CreateSubRoomDialog
          open={!!preselectedRoomId || isCreateSubRoomDialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              setPreselectedRoomId(null)
              setIsCreateSubRoomDialogOpen(false)
            }
          }}
          onSuccess={() => {
            fetchRooms()
            setPreselectedRoomId(null)
            setIsCreateSubRoomDialogOpen(false)
          }}
          establishmentId={establishmentId}
          preselectedRoomId={preselectedRoomId}
          userRole={effectiveUserRole}
        />
      </ErrorBoundary>
    </div>
  )
}
