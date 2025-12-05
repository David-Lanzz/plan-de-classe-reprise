"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { toast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"
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
  Sparkles,
  RefreshCw,
} from "lucide-react"
import { DeleteConfirmationDialog } from "@/components/delete-confirmation-dialog"
import { TemplateSelectionDialog } from "@/components/template-selection-dialog"
import type { RoomTemplate } from "@/components/room-templates"
import type { UserRole } from "@/lib/types"

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
  rooms?: Room[] // Rendu optionnel
  establishmentId: string
  userRole: UserRole
  userId: string
  onBack?: () => void
}

export function RoomsManagement({
  rooms: initialRooms,
  establishmentId,
  userRole,
  userId,
  onBack,
}: RoomsManagementProps) {
  const router = useRouter()
  // Initialiser avec un tableau vide si rooms n'est pas fourni
  const [rooms, setRooms] = useState<Room[]>(initialRooms || [])
  const [filteredRooms, setFilteredRooms] = useState<Room[]>(initialRooms || [])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([])
  const [viewedRoom, setViewedRoom] = useState<Room | null>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [roomsToDelete, setRoomsToDelete] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isInitialLoading, setIsInitialLoading] = useState(!initialRooms) // Nouveau state pour chargement initial
  const [editingRoom, setEditingRoom] = useState<Room | null>(null)
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false)
  const [creationMode, setCreationMode] = useState<"template" | "custom" | null>(null)

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

  // Charger les salles si non fournies en props
  useEffect(() => {
    if (!initialRooms) {
      fetchRooms()
    }
  }, [initialRooms, establishmentId])

  const fetchRooms = async () => {
    try {
      setIsInitialLoading(true)
      const supabase = createClient()
      
      const { data, error } = await supabase
        .from("rooms")
        .select("*")
        .eq("establishment_id", establishmentId)
        .order("name", { ascending: true })

      if (error) {
        console.error("Erreur chargement salles:", error)
        toast({
          title: "Erreur",
          description: "Impossible de charger les salles",
          variant: "destructive",
        })
        return
      }

      const safeData = Array.isArray(data) ? data : []
      setRooms(safeData)
      setFilteredRooms(safeData)
    } catch (err) {
      console.error("Erreur fetchRooms:", err)
    } finally {
      setIsInitialLoading(false)
    }
  }

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredRooms(rooms)
    } else {
      const query = searchQuery.toLowerCase()
      setFilteredRooms(
        rooms.filter((room) => room.name.toLowerCase().includes(query) || room.code.toLowerCase().includes(query)),
      )
    }
  }, [searchQuery, rooms])

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
        title: "Erreur",
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
    return formData.columns.reduce((total, column) => {
      return total + column.tables * column.seatsPerTable
    }, 0)
  }

  const calculateTotalWidth = () => {
    return formData.columns.reduce((total, column) => {
      return total + column.seatsPerTable
    }, 0)
  }

  const handleAddRoom = async () => {
    if (!formData.name.trim() || !formData.code.trim()) {
      toast({
        title: "Erreur",
        description: "Le nom et le code de la salle sont requis",
        variant: "destructive",
      })
      return
    }

    const totalSeats = calculateTotalSeats()
    if (totalSeats > 350) {
      toast({
        title: "Erreur",
        description: "Le nombre total de places ne peut pas dépasser 350",
        variant: "destructive",
      })
      return
    }

    const totalWidth = calculateTotalWidth()
    if (totalWidth > 10) {
      toast({
        title: "Erreur",
        description: "Le nombre total de places en largeur ne peut pas dépasser 10",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      const supabase = createClient()

      const { data, error } = await supabase
        .from("rooms")
        .insert({
          establishment_id: establishmentId,
          name: formData.name,
          code: formData.code,
          board_position: formData.boardPosition,
          config: { columns: formData.columns },
          created_by: userId,
        })
        .select()
        .single()

      if (error) throw error

      setRooms([...rooms, data])
      setIsAddDialogOpen(false)
      setCreationMode(null)
      resetForm()

      toast({
        title: "Succès",
        description: "La salle a été créée avec succès",
      })
    } catch (error) {
      console.error("Error adding room:", error)
      toast({
        title: "Erreur",
        description: "Impossible de créer la salle",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleEditRoom = async () => {
    if (!editingRoom) return

    if (!formData.name.trim() || !formData.code.trim()) {
      toast({
        title: "Erreur",
        description: "Le nom et le code de la salle sont requis",
        variant: "destructive",
      })
      return
    }

    const totalSeats = calculateTotalSeats()
    if (totalSeats > 350) {
      toast({
        title: "Erreur",
        description: "Le nombre total de places ne peut pas dépasser 350",
        variant: "destructive",
      })
      return
    }

    const totalWidth = calculateTotalWidth()
    if (totalWidth > 10) {
      toast({
        title: "Erreur",
        description: "Le nombre total de places en largeur ne peut pas dépasser 10",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      const supabase = createClient()

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

      setRooms(
        rooms.map((room) =>
          room.id === editingRoom.id
            ? {
                ...room,
                name: formData.name,
                code: formData.code,
                board_position: formData.boardPosition,
                config: { columns: formData.columns },
              }
            : room,
        ),
      )

      setIsEditDialogOpen(false)
      setEditingRoom(null)
      resetForm()

      toast({
        title: "Succès",
        description: "La salle a été modifiée avec succès",
      })
    } catch (error) {
      console.error("Error editing room:", error)
      toast({
        title: "Erreur",
        description: "Impossible de modifier la salle",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteRooms = async () => {
    if (roomsToDelete.length === 0) return

    setIsLoading(true)

    try {
      const supabase = createClient()

      const { error } = await supabase.from("rooms").delete().in("id", roomsToDelete)

      if (error) throw error

      setRooms(rooms.filter((room) => !roomsToDelete.includes(room.id)))
      setSelectedRoomIds([])
      setRoomsToDelete([])
      setIsDeleteDialogOpen(false)

      toast({
        title: "Succès",
        description: `${roomsToDelete.length} salle(s) supprimée(s) avec succès`,
      })
    } catch (error) {
      console.error("Error deleting rooms:", error)
      toast({
        title: "Erreur",
        description: "Impossible de supprimer les salles",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDuplicateRoom = async (room: Room) => {
    setIsLoading(true)

    try {
      const supabase = createClient()

      const { data, error } = await supabase
        .from("rooms")
        .insert({
          establishment_id: establishmentId,
          name: `${room.name} (copie)`,
          code: `${room.code}_copy`,
          board_position: room.board_position,
          config: room.config,
          created_by: userId,
        })
        .select()
        .single()

      if (error) throw error

      setRooms([...rooms, data])

      toast({
        title: "Succès",
        description: "La salle a été dupliquée avec succès",
      })
    } catch (error) {
      console.error("Error duplicating room:", error)
      toast({
        title: "Erreur",
        description: "Impossible de dupliquer la salle",
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
      columns: room.config?.columns || [
        { id: "col1", tables: 5, seatsPerTable: 2 },
        { id: "col2", tables: 5, seatsPerTable: 2 },
        { id: "col3", tables: 4, seatsPerTable: 2 },
      ],
    })
    setIsEditDialogOpen(true)
  }

  const openDeleteDialog = (roomIds: string[]) => {
    setRoomsToDelete(roomIds)
    setIsDeleteDialogOpen(true)
  }

  const resetForm = () => {
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
  }

  const toggleRoomSelection = (roomId: string) => {
    setSelectedRoomIds((prev) => (prev.includes(roomId) ? prev.filter((id) => id !== roomId) : [...prev, roomId]))
  }

  const toggleAllRooms = () => {
    if (selectedRoomIds.length === filteredRooms.length) {
      setSelectedRoomIds([])
    } else {
      setSelectedRoomIds(filteredRooms.map((room) => room.id))
    }
  }

  const handleSelectTemplate = (template: RoomTemplate) => {
    setFormData({
      name: "",
      code: "",
      boardPosition: template.boardPosition,
      columns: template.columns.map((col, index) => ({
        id: `col${index + 1}`,
        tables: col.tables,
        seatsPerTable: col.seatsPerTable,
      })),
    })
    setIsTemplateDialogOpen(false)
    setCreationMode("template")
    setIsAddDialogOpen(true)
  }

  const handleStartCustomCreation = () => {
    resetForm()
    setCreationMode("custom")
    setIsAddDialogOpen(true)
  }

  const canEdit = userRole === "vie-scolaire"

  // Affichage du chargement initial
  if (isInitialLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="container mx-auto p-6 max-w-7xl">
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-3 text-muted-foreground">Chargement des salles...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" onClick={onBack || (() => router.back())}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Button>
          <h1 className="text-2xl font-bold">Gestion des Salles</h1>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher une salle..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {canEdit && (
            <div className="flex gap-2">
              {selectedRoomIds.length > 0 && (
                <Button variant="destructive" onClick={() => openDeleteDialog(selectedRoomIds)}>
                  <Trash className="mr-2 h-4 w-4" />
                  Supprimer ({selectedRoomIds.length})
                </Button>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Nouvelle salle
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setIsTemplateDialogOpen(true)}>
                    <LayoutTemplate className="mr-2 h-4 w-4" />
                    Utiliser un modèle
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleStartCustomCreation}>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Créer personnalisé
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        {viewedRoom ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">
                {viewedRoom.name} ({viewedRoom.code})
              </h2>
              <Button variant="ghost" onClick={() => setViewedRoom(null)}>
                <X className="mr-2 h-4 w-4" />
                Fermer
              </Button>
            </div>
            <RoomVisualization room={viewedRoom} />
          </div>
        ) : (
          <>
            {filteredRooms.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <p className="text-muted-foreground mb-4">Aucune salle trouvée</p>
                  {canEdit && (
                    <Button onClick={handleStartCustomCreation}>
                      <Plus className="mr-2 h-4 w-4" />
                      Créer une salle
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b dark:border-slate-700">
                        {canEdit && (
                          <th className="px-4 py-3 text-left">
                            <Checkbox
                              checked={selectedRoomIds.length === filteredRooms.length && filteredRooms.length > 0}
                              onCheckedChange={toggleAllRooms}
                            />
                          </th>
                        )}
                        <th className="px-4 py-3 text-left font-medium">Nom</th>
                        <th className="px-4 py-3 text-left font-medium">Code</th>
                        <th className="px-4 py-3 text-left font-medium">Configuration</th>
                        <th className="px-4 py-3 text-left font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRooms.map((room) => (
                        <tr key={room.id} className="border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                          {canEdit && (
                            <td className="px-4 py-3">
                              <Checkbox
                                checked={selectedRoomIds.includes(room.id)}
                                onCheckedChange={() => toggleRoomSelection(room.id)}
                              />
                            </td>
                          )}
                          <td className="px-4 py-3 font-medium">{room.name}</td>
                          <td className="px-4 py-3 text-muted-foreground">{room.code}</td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">
                            {room.config?.columns?.length || 0} colonnes •{" "}
                            {room.config?.columns?.reduce((sum, col) => sum + col.tables * col.seatsPerTable, 0) || 0} places
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Button variant="ghost" size="icon" onClick={() => setViewedRoom(room)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              {canEdit && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => openEditDialog(room)}>
                                      <Edit className="mr-2 h-4 w-4" />
                                      Modifier
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleDuplicateRoom(room)}>
                                      <Copy className="mr-2 h-4 w-4" />
                                      Dupliquer
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="text-red-600"
                                      onClick={() => openDeleteDialog([room.id])}
                                    >
                                      <Trash className="mr-2 h-4 w-4" />
                                      Supprimer
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {/* Add Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {creationMode === "template" ? "Nouvelle salle (depuis modèle)" : "Nouvelle salle personnalisée"}
              </DialogTitle>
              <DialogDescription>
                Configurez les paramètres de la nouvelle salle
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Nom de la salle</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Salle 101"
                  />
                </div>
                <div>
                  <Label htmlFor="code">Code</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="Ex: S101"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="boardPosition">Position du tableau</Label>
                <Select
                  value={formData.boardPosition}
                  onValueChange={(value: "top" | "bottom" | "left" | "right") =>
                    setFormData({ ...formData, boardPosition: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="top">Haut</SelectItem>
                    <SelectItem value="bottom">Bas</SelectItem>
                    <SelectItem value="left">Gauche</SelectItem>
                    <SelectItem value="right">Droite</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-lg font-medium">Configuration des colonnes</h3>
                  <div className="text-sm text-muted-foreground">
                    Total: {calculateTotalSeats()} places (max 350) • Largeur: {calculateTotalWidth()} (max 10)
                    {calculateTotalSeats() > 350 && <span className="text-red-500 ml-2">(Capacité dépassée)</span>}
                    {calculateTotalWidth() > 10 && <span className="text-red-500 ml-2">(Largeur dépassée)</span>}
                  </div>
                </div>

                <div className="space-y-4">
                  {formData.columns.map((column, index) => (
                    <div key={index} className="grid grid-cols-12 gap-4 items-center p-2 border rounded-md">
                      <div className="col-span-1 font-medium text-center">{index + 1}</div>
                      <div className="col-span-5">
                        <Label htmlFor={`add-tables-${index}`}>Nombre de tables</Label>
                        <Input
                          id={`add-tables-${index}`}
                          type="number"
                          min="1"
                          max="20"
                          value={column.tables}
                          onChange={(e) => handleColumnChange(index, "tables", Number.parseInt(e.target.value) || 1)}
                        />
                      </div>
                      <div className="col-span-5">
                        <Label htmlFor={`add-seats-${index}`}>Places par table</Label>
                        <Input
                          id={`add-seats-${index}`}
                          type="number"
                          min="1"
                          max="7"
                          value={column.seatsPerTable}
                          onChange={(e) =>
                            handleColumnChange(index, "seatsPerTable", Number.parseInt(e.target.value) || 1)
                          }
                        />
                      </div>
                      <div className="col-span-1">
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
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsAddDialogOpen(false)
                  setCreationMode(null)
                }}
              >
                Annuler
              </Button>
              <Button onClick={handleAddRoom} disabled={isLoading}>
                {isLoading ? "Création..." : "Créer"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Modifier la salle</DialogTitle>
              <DialogDescription>Modifiez les paramètres de la salle</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-name">Nom de la salle</Label>
                  <Input
                    id="edit-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Salle 101"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-code">Code</Label>
                  <Input
                    id="edit-code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="Ex: S101"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="edit-boardPosition">Position du tableau</Label>
                <Select
                  value={formData.boardPosition}
                  onValueChange={(value: "top" | "bottom" | "left" | "right") =>
                    setFormData({ ...formData, boardPosition: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="top">Haut</SelectItem>
                    <SelectItem value="bottom">Bas</SelectItem>
                    <SelectItem value="left">Gauche</SelectItem>
                    <SelectItem value="right">Droite</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-lg font-medium">Configuration des colonnes</h3>
                  <div className="text-sm text-muted-foreground">
                    Total: {calculateTotalSeats()} places (max 350) • Largeur: {calculateTotalWidth()} (max 10)
                    {calculateTotalSeats() > 350 && <span className="text-red-500 ml-2">(Capacité dépassée)</span>}
                    {calculateTotalWidth() > 10 && <span className="text-red-500 ml-2">(Largeur dépassée)</span>}
                  </div>
                </div>

                <div className="space-y-4">
                  {formData.columns.map((column, index) => (
                    <div key={index} className="grid grid-cols-12 gap-4 items-center p-2 border rounded-md">
                      <div className="col-span-1 font-medium text-center">{index + 1}</div>
                      <div className="col-span-5">
                        <Label htmlFor={`tables-${index}`}>Nombre de tables</Label>
                        <Input
                          id={`tables-${index}`}
                          type="number"
                          min="1"
                          max="20"
                          value={column.tables}
                          onChange={(e) => handleColumnChange(index, "tables", Number.parseInt(e.target.value) || 1)}
                        />
                      </div>
                      <div className="col-span-5">
                        <Label htmlFor={`seats-${index}`}>Places par table</Label>
                        <Input
                          id={`seats-${index}`}
                          type="number"
                          min="1"
                          max="7"
                          value={column.seatsPerTable}
                          onChange={(e) =>
                            handleColumnChange(index, "seatsPerTable", Number.parseInt(e.target.value) || 1)
                          }
                        />
                      </div>
                      <div className="col-span-1">
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
          itemCount={roomsToDelete.length}
          itemType="salle"
        />
        <TemplateSelectionDialog
          open={isTemplateDialogOpen}
          onOpenChange={setIsTemplateDialogOpen}
          onSelectTemplate={handleSelectTemplate}
        />
      </div>

      <Toaster />
    </div>
  )
}

function RoomVisualization({ room }: { room: Room }) {
  const { config, board_position } = room

  if (!config || !config.columns || !Array.isArray(config.columns)) {
    return (
      <div className="flex items-center justify-center p-12 text-muted-foreground">
        <p>Configuration de la salle invalide</p>
      </div>
    )
  }

  let seatNumber = 1
  const boardMargin = 100 // pixels of space around the board

  return (
    <div className="relative border-2 border-emerald-200 dark:border-emerald-800 rounded-xl p-16 bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 min-h-[600px] overflow-auto">
      {/* Board - Top */}
      {board_position === "top" && (
        <div className="absolute top-8 left-1/2 transform -translate-x-1/2 bg-gradient-to-b from-slate-700 via-slate-800 to-slate-900 text-white px-16 py-6 rounded-md font-semibold text-xl shadow-2xl border-2 border-slate-600">
          <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent rounded-md" />
          <span className="relative tracking-wider">TABLEAU</span>
        </div>
      )}

      {/* Board - Bottom */}
      {board_position === "bottom" && (
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-gradient-to-b from-slate-700 via-slate-800 to-slate-900 text-white px-16 py-6 rounded-md font-semibold text-xl shadow-2xl border-2 border-slate-600">
          <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent rounded-md" />
          <span className="relative tracking-wider">TABLEAU</span>
        </div>
      )}

      {/* Board - Left */}
      {board_position === "left" && (
        <div
          className="absolute left-8 top-1/2 transform -translate-y-1/2 bg-gradient-to-r from-slate-700 via-slate-800 to-slate-900 text-white px-6 py-16 rounded-md font-semibold text-xl shadow-2xl border-2 border-slate-600"
          style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent rounded-md" />
          <span className="relative tracking-wider">TABLEAU</span>
        </div>
      )}

      {/* Board - Right */}
      {board_position === "right" && (
        <div
          className="absolute right-8 top-1/2 transform -translate-y-1/2 bg-gradient-to-l from-slate-700 via-slate-800 to-slate-900 text-white px-6 py-16 rounded-md font-semibold text-xl shadow-2xl border-2 border-slate-600"
          style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
        >
          <div className="absolute inset-0 bg-gradient-to-l from-white/5 to-transparent rounded-md" />
          <span className="relative tracking-wider">TABLEAU</span>
        </div>
      )}

      <div
        className="flex justify-center items-center gap-16 h-full"
        style={{
          marginTop: board_position === "top" ? `${boardMargin}px` : "0",
          marginBottom: board_position === "bottom" ? `${boardMargin}px` : "0",
          marginLeft: board_position === "left" ? `${boardMargin}px` : "0",
          marginRight: board_position === "right" ? `${boardMargin}px` : "0",
        }}
      >
        {config.columns.map((column, colIndex) => (
          <div key={colIndex} className="flex flex-col gap-8">
            {Array.from({ length: column.tables }).map((_, tableIndex) => (
              <div
                key={tableIndex}
                className="relative bg-gradient-to-br from-amber-700 via-amber-800 to-amber-900 dark:from-amber-900/50 dark:to-amber-950/50 rounded-2xl p-4 shadow-lg border-2 border-amber-900 dark:border-amber-950"
                style={{ minWidth: `${column.seatsPerTable * 80}px` }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/20 rounded-2xl pointer-events-none" />
                <div
                  className="absolute inset-0 opacity-20 rounded-2xl pointer-events-none"
                  style={{
                    backgroundImage:
                      "repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(0,0,0,0.1) 2px, rgba(0,0,0,0.1) 4px)",
                  }}
                />

                <div className="relative flex gap-4 justify-center">
                  {Array.from({ length: column.seatsPerTable }).map((_, seatIndex) => {
                    const currentSeatNumber = seatNumber++
                    return (
                      <div
                        key={seatIndex}
                        className="w-16 h-16 bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-600 hover:from-emerald-500 hover:via-emerald-600 hover:to-emerald-700 text-white rounded-xl flex items-center justify-center text-lg font-bold shadow-md hover:shadow-xl transition-all duration-200 hover:scale-105 border border-emerald-300 cursor-pointer"
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-xl" />
                        <span className="relative drop-shadow-sm">{currentSeatNumber}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
