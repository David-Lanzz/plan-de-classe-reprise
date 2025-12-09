"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "@/components/ui/use-toast"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon } from "lucide-react"
import { format, addDays } from "date-fns"
import { fr } from "date-fns/locale"
import type { SubRoomType } from "@/lib/types"

interface SubRoomDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  roomAssignmentId: string
  userId: string
  userRole: string
  establishmentId: string
  availableTeachers: any[]
  availableClasses: any[]
  onSuccess: () => void
}

export function SubRoomDialog({
  open,
  onOpenChange,
  roomAssignmentId,
  userId,
  userRole,
  establishmentId,
  availableTeachers,
  availableClasses,
  onSuccess,
}: SubRoomDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [selectedTeachers, setSelectedTeachers] = useState<string[]>([])
  const [selectedClasses, setSelectedClasses] = useState<string[]>([])
  const [isCollaborative, setIsCollaborative] = useState(false)
  const [filteredClasses, setFilteredClasses] = useState<any[]>([])
  const [formData, setFormData] = useState({
    name: "",
    type: "temporary" as SubRoomType,
    start_date: new Date(),
    end_date: addDays(new Date(), 2),
  })

  useEffect(() => {
    const filterClassesByTeachers = async () => {
      if (selectedTeachers.length === 0) {
        setFilteredClasses([])
        setSelectedClasses([]) // Reset selected classes
        return
      }

      const supabase = createClient()

      const { data: teacherClasses } = await supabase
        .from("teacher_classes")
        .select("class_id")
        .in("teacher_id", selectedTeachers)

      if (teacherClasses) {
        const classIds = teacherClasses.map((tc) => tc.class_id)
        const filtered = availableClasses.filter((c) => classIds.includes(c.id) && !c.is_level)
        setFilteredClasses(filtered)

        // Remove classes that are no longer valid
        setSelectedClasses((prev) => prev.filter((id) => classIds.includes(id)))
      }
    }

    filterClassesByTeachers()
  }, [selectedTeachers, availableClasses])

  const handleTeacherToggle = (teacherId: string) => {
    setSelectedTeachers((prev) => {
      if (prev.includes(teacherId)) {
        return prev.filter((id) => id !== teacherId)
      }
      if (isCollaborative || prev.length === 0) {
        return [...prev, teacherId]
      }
      return [teacherId] // Replace if not collaborative
    })
  }

  const handleCreateSubRoom = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Erreur",
        description: "Le nom de la sous-salle est requis",
        variant: "destructive",
      })
      return
    }

    if (selectedTeachers.length === 0) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner au moins un professeur",
        variant: "destructive",
      })
      return
    }

    if (selectedClasses.length === 0) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner au moins une classe",
        variant: "destructive",
      })
      return
    }

    if (formData.type === "temporary") {
      const daysDiff = Math.ceil((formData.end_date.getTime() - formData.start_date.getTime()) / (1000 * 60 * 60 * 24))

      if (daysDiff < 2) {
        toast({
          title: "Erreur",
          description: "La durée minimale est de 2 jours",
          variant: "destructive",
        })
        return
      }
    }

    setIsLoading(true)
    const supabase = createClient()

    try {
      const insertData: any = {
        room_assignment_id: roomAssignmentId,
        name: formData.name,
        type: formData.type,
        class_ids: selectedClasses,
        seat_assignments: {},
        is_modifiable_by_delegates: true,
        is_collaborative: isCollaborative,
        created_by: userId,
      }

      if (formData.type === "temporary") {
        insertData.start_date = formData.start_date.toISOString()
        insertData.end_date = formData.end_date.toISOString()
      }

      const { data: subRoom, error: subRoomError } = await supabase
        .from("sub_rooms")
        .insert(insertData)
        .select()
        .single()

      if (subRoomError) throw subRoomError

      const teacherAssociations = selectedTeachers.map((teacherId) => ({
        sub_room_id: subRoom.id,
        teacher_id: teacherId,
      }))

      const { error: teacherError } = await supabase.from("sub_room_teachers").insert(teacherAssociations)

      if (teacherError) throw teacherError

      toast({
        title: "Sous-salle créée",
        description: `La sous-salle "${formData.name}" a été créée avec succès`,
      })

      // Reset form
      setFormData({
        name: "",
        type: "temporary",
        start_date: new Date(),
        end_date: addDays(new Date(), 2),
      })
      setSelectedTeachers([])
      setSelectedClasses([])
      setIsCollaborative(false)

      onOpenChange(false)
      onSuccess()
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer la sous-salle",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Créer une sous-salle</DialogTitle>
          <DialogDescription>Créez une configuration personnalisée de cette salle</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Nom de la sous-salle *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="ex: Configuration examen du 15 janvier"
            />
          </div>

          <div className="flex items-center space-x-3 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border-2 border-blue-200 dark:border-blue-800">
            <Checkbox
              id="collaborative"
              checked={isCollaborative}
              onCheckedChange={(checked) => {
                setIsCollaborative(checked as boolean)
                if (!checked && selectedTeachers.length > 1) {
                  setSelectedTeachers([selectedTeachers[0]])
                }
              }}
            />
            <Label htmlFor="collaborative" className="cursor-pointer flex-1">
              <div className="font-semibold text-blue-900 dark:text-blue-100">
                🤝 Salle collaborative multi-professeurs
              </div>
              <div className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                Cochez cette case pour permettre à plusieurs professeurs de gérer cette sous-salle ensemble
              </div>
            </Label>
          </div>

          <div className="space-y-2">
            <Label className="text-base font-semibold">👨‍🏫 Professeur{isCollaborative ? "s" : ""} *</Label>
            <p className="text-sm text-muted-foreground">
              {isCollaborative ? "Sélectionnez un ou plusieurs professeurs" : "Sélectionnez un seul professeur"}
            </p>
            <div className="border-2 rounded-lg p-4 space-y-2 max-h-48 overflow-y-auto bg-gray-50 dark:bg-gray-900">
              {availableTeachers.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-4">Aucun professeur disponible</div>
              ) : (
                availableTeachers.map((teacher) => (
                  <div
                    key={teacher.id}
                    className="flex items-center space-x-3 p-2 hover:bg-white dark:hover:bg-gray-800 rounded transition-colors"
                  >
                    <Checkbox
                      id={`teacher-${teacher.id}`}
                      checked={selectedTeachers.includes(teacher.id)}
                      onCheckedChange={() => handleTeacherToggle(teacher.id)}
                    />
                    <Label htmlFor={`teacher-${teacher.id}`} className="flex-1 cursor-pointer font-medium">
                      {teacher.first_name} {teacher.last_name}
                      <span className="text-sm text-muted-foreground ml-2">• {teacher.subject}</span>
                    </Label>
                  </div>
                ))
              )}
            </div>
            {selectedTeachers.length > 0 && (
              <div className="text-sm font-medium text-green-600 dark:text-green-400">
                ✓ {selectedTeachers.length} professeur{selectedTeachers.length > 1 ? "s" : ""} sélectionné
                {selectedTeachers.length > 1 ? "s" : ""}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-base font-semibold">
              📚 Classe{isCollaborative || selectedClasses.length > 1 ? "s" : ""} *
            </Label>
            {selectedTeachers.length === 0 ? (
              <div className="text-sm p-6 bg-amber-50 dark:bg-amber-950 rounded-lg border-2 border-amber-200 dark:border-amber-800 text-center">
                <div className="text-4xl mb-2">👆</div>
                <div className="font-medium text-amber-900 dark:text-amber-100">
                  Veuillez d'abord sélectionner un ou plusieurs professeurs
                </div>
                <div className="text-amber-700 dark:text-amber-300 mt-1">
                  Les classes disponibles dépendent des professeurs sélectionnés
                </div>
              </div>
            ) : filteredClasses.length === 0 ? (
              <div className="text-sm p-6 bg-red-50 dark:bg-red-950 rounded-lg border-2 border-red-200 dark:border-red-800 text-center">
                <div className="text-4xl mb-2">⚠️</div>
                <div className="font-medium text-red-900 dark:text-red-100">Aucune classe disponible</div>
                <div className="text-red-700 dark:text-red-300 mt-1">
                  {selectedTeachers.length > 1 ? "Ces professeurs n'enseignent" : "Ce professeur n'enseigne"} à aucune
                  classe
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Seules les classes enseignées par{" "}
                  {selectedTeachers.length > 1 ? "les professeurs sélectionnés" : "le professeur sélectionné"}
                </p>
                <div className="border-2 rounded-lg p-4 space-y-2 max-h-48 overflow-y-auto bg-gray-50 dark:bg-gray-900">
                  {filteredClasses.map((cls) => (
                    <div
                      key={cls.id}
                      className="flex items-center space-x-3 p-2 hover:bg-white dark:hover:bg-gray-800 rounded transition-colors"
                    >
                      <Checkbox
                        id={`class-${cls.id}`}
                        checked={selectedClasses.includes(cls.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            if (isCollaborative) {
                              setSelectedClasses((prev) => [...prev, cls.id])
                            } else {
                              setSelectedClasses([cls.id])
                            }
                          } else {
                            setSelectedClasses((prev) => prev.filter((id) => id !== cls.id))
                          }
                        }}
                      />
                      <Label htmlFor={`class-${cls.id}`} className="flex-1 cursor-pointer font-medium">
                        {cls.name}
                      </Label>
                    </div>
                  ))}
                </div>
                {selectedClasses.length > 0 && (
                  <div className="text-sm font-medium text-green-600 dark:text-green-400">
                    ✓ {selectedClasses.length} classe{selectedClasses.length > 1 ? "s" : ""} sélectionnée
                    {selectedClasses.length > 1 ? "s" : ""}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="space-y-2">
            <Label>Type de sous-salle</Label>
            <RadioGroup
              value={formData.type}
              onValueChange={(value: SubRoomType) => setFormData({ ...formData, type: value })}
            >
              <div className="flex items-center space-x-2 border rounded-md p-3">
                <RadioGroupItem value="temporary" id="temporary" />
                <Label htmlFor="temporary" className="flex-1 cursor-pointer">
                  <div className="font-medium">Temporaire</div>
                  <div className="text-sm text-muted-foreground">
                    Durée fixe avec dates de début et fin (min. 2 jours, suppression automatique)
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-2 border rounded-md p-3">
                <RadioGroupItem value="indeterminate" id="indeterminate" />
                <Label htmlFor="indeterminate" className="flex-1 cursor-pointer">
                  <div className="font-medium">Indéterminée</div>
                  <div className="text-sm text-muted-foreground">
                    Sans date de fin (suppression manuelle uniquement)
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {formData.type === "temporary" && (
            <>
              <div className="space-y-2">
                <Label>Date de début</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal bg-transparent">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(formData.start_date, "PPP", { locale: fr })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.start_date}
                      onSelect={(date) => date && setFormData({ ...formData, start_date: date })}
                      disabled={(date) => date < new Date()}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Date de fin</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal bg-transparent">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(formData.end_date, "PPP", { locale: fr })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.end_date}
                      onSelect={(date) => date && setFormData({ ...formData, end_date: date })}
                      disabled={(date) => date < addDays(formData.start_date, 2)}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="text-sm text-muted-foreground">
                Durée:{" "}
                {Math.ceil((formData.end_date.getTime() - formData.start_date.getTime()) / (1000 * 60 * 60 * 24))} jours
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleCreateSubRoom} disabled={isLoading}>
            {isLoading ? "Création..." : "Créer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
