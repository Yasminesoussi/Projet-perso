// Screen Admin “Gestion Tickets”: UI de packs/tickets, données via PackService
import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar, Modal, TextInput, ActivityIndicator, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import Colors from "../../constants/Colors";
import PackService from "../../services/PackService";
import AdminTicketsService from "../../services/AdminTicketsService";
import BottomTabs from "../../navigation/BottomTabs";

export default function GestionTicketsScreen() {
    const navigation = useNavigation();
    const [activeTab, setActiveTab] = useState("Tickets");

    // Modal State
    const [modalVisible, setModalVisible] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentPack, setCurrentPack] = useState({ id: null, name: "", tickets: "", price: "", description: "" });

    const [packs, setPacks] = useState([]);
    const [students, setStudents] = useState([]);
    const [history, setHistory] = useState([]);
    const [ticketStats, setTicketStats] = useState({ sold: 0, used: 0, revenue: 0 });
    const [studentSearch, setStudentSearch] = useState("");
    const [isLoading, setIsLoading] = useState(true);

    const fetchDashboard = async () => {
        const dashboard = await AdminTicketsService.getDashboard();
        setStudents(Array.isArray(dashboard.students) ? dashboard.students : []);
        setHistory(Array.isArray(dashboard.history) ? dashboard.history : []);
        setTicketStats(dashboard.stats || { sold: 0, used: 0, revenue: 0 });
    };

    const fetchPacks = async () => {
        try {
            setIsLoading(true);
            const [data] = await Promise.all([
                PackService.getAllPacks(),
                fetchDashboard(),
            ]);
            if (Array.isArray(data)) {
                setPacks(data);
            } else {
                setPacks([]);
            }
        } catch (error) {
            console.error("Failed to fetch packs", error);
            Alert.alert("Erreur", "Impossible de charger les packs.");
        } finally {
            setIsLoading(false);
        }
    };
    useEffect(() => {
        fetchPacks();
    }, []);

    // Modal Handlers
    const openCreateModal = () => {
        setIsEditing(false);
        setCurrentPack({ id: null, name: "", tickets: "", price: "", description: "" });
        setModalVisible(true);
    };

    const openEditModal = (pack) => {
        setIsEditing(true);
        const desc =
            (pack && (pack.description ?? pack.desc ?? pack.detail ?? pack.details)) || "";
        setCurrentPack({
            id: pack._id,
            _id: pack._id,
            name: pack.nom,
            tickets: pack.nbTickets ? pack.nbTickets.toString() : "",
            price: pack.prix ? pack.prix.toString() : "",
            description: desc
        });
        setModalVisible(true);
    };

    const handleSavePack = async () => {
        try {
            if (!currentPack.name || !currentPack.tickets || !currentPack.price) {
                Alert.alert("Erreur", "Veuillez remplir tous les champs corretamente.");
                return;
            }

            const packData = {
                nom: currentPack.name,
                nbTickets: parseInt(currentPack.tickets),
                prix: parseFloat(currentPack.price),
                description: currentPack.description
            };

            if (isEditing) {
                await PackService.updatePack(currentPack._id, packData);
            } else {
                await PackService.createPack(packData);
            }
            setModalVisible(false);
            fetchPacks();
        } catch (error) {
            console.error("Error saving pack", error);
            const errorMessage = error.response?.data?.message || error.message || "Erreur lors de l'enregistrement";
            Alert.alert("Erreur", errorMessage);
        }
    };

    const handleDeletePack = async (id) => {
        try {
            await PackService.deletePack(id);
            fetchPacks();
        } catch (error) {
            console.error("Error deleting pack", error);
            Alert.alert("Erreur", "Erreur lors de la suppression");
        }
    };

    const formatRevenue = (value) => {
        const numeric = Number(value || 0);
        return `${numeric.toFixed(Number.isInteger(numeric) ? 0 : 2)} DT`;
    };

    const formatHistoryDate = (value) => {
        if (!value) return "";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return "";
        return date.toLocaleString("fr-FR", {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const normalizeStudentStatus = (status) => {
        if (status === "ACCEPTED") return { label: "Actif", color: "#4CAF50" };
        if (status === "PENDING") return { label: "En attente", color: "#F59E0B" };
        if (status === "REJECTED") return { label: "Rejete", color: "#F44336" };
        return { label: status || "Inconnu", color: "#888" };
    };

    const filteredStudents = students.filter((student) => {
        const q = studentSearch.trim().toLowerCase();
        if (!q) return true;
        return [student.fullName, student.email, student.studentNumber]
            .some((value) => String(value || "").toLowerCase().includes(q));
    });

    const renderHeader = () => (
        <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Gestion Tickets</Text>
            <TouchableOpacity style={styles.iconBtn}>
                <Ionicons name="settings-outline" size={22} color={Colors.text} />
            </TouchableOpacity>
        </View>
    );


    const renderTicketsTab = () => (
        <View>
            {/* Stats Cards */}
            <View style={styles.statsRow}>
                <View style={styles.statCard}>
                    <Text style={styles.statValue}>{ticketStats.sold}</Text>
                    <Text style={styles.statLabel}>Vendus</Text>
                </View>
                <View style={styles.statCard}>
                    <Text style={styles.statValue}>{ticketStats.used}</Text>
                    <Text style={styles.statLabel}>Utilisés</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: Colors.accent }]}>
                    <Text style={[styles.statValue, { color: Colors.primary }]}>{formatRevenue(ticketStats.revenue)}</Text>
                    <Text style={[styles.statLabel, { color: Colors.primary }]}>Revenus</Text>
                </View>
            </View>

            {/* Packs Section */}
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Packs Disponibles</Text>
                <TouchableOpacity style={styles.addPackBtn} onPress={openCreateModal}>
                    <Ionicons name="add" size={18} color="#fff" />
                    <Text style={styles.addPackText}>Nouveau</Text>
                </TouchableOpacity>
            </View>

            {isLoading ? (
                <View style={[styles.centerContent, { padding: 20 }]}>
                    <ActivityIndicator size="large" color={Colors.text} />
                    <Text style={{ marginTop: 10, color: Colors.text }}>Chargement des packs...</Text>
                </View>
            ) : (
                <>
                    {Array.isArray(packs) && packs.length > 0 ? (
                        packs.map((pack) => (
                            <View key={pack._id} style={styles.packCard}>
                                <View style={styles.packInfo}>
                                    <View style={styles.packIcon}>
                                        <Ionicons name="pricetag-outline" size={20} color={Colors.primary} />
                                    </View>
                                    <View>
                                        <Text style={styles.packName}>{pack.nom}</Text>
                                        <Text style={styles.packDetail}>{pack.nbTickets} tickets • {pack.prix} DT</Text>
                                        {(() => {
                                            const desc = pack.description ?? pack.desc ?? pack.detail ?? pack.details;
                                            if (!desc) return null;
                                            return <Text style={styles.packDescription}>{desc}</Text>;
                                        })()}
                                    </View>
                                </View>
                                <View style={styles.packActions}>
                                    <TouchableOpacity style={styles.actionBtn} onPress={() => openEditModal(pack)}>
                                        <Ionicons name="create-outline" size={20} color={Colors.text} />
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.actionBtn} onPress={() => handleDeletePack(pack._id)}>
                                        <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))
                    ) : (
                        <Text style={{ textAlign: "center", color: Colors.text, opacity: 0.6, marginTop: 20 }}>
                            Aucun pack disponible.
                        </Text>
                    )}
                </>
            )}
        </View>
    );



    const renderStudentsTab = () => (
        <View>
            <View style={styles.searchContainer}>
                <Ionicons name="search-outline" size={20} color="#999" style={styles.searchIcon} />
                <TextInput
                    placeholder="Rechercher etudiant..."
                    style={styles.searchInput}
                    placeholderTextColor="#999"
                    value={studentSearch}
                    onChangeText={setStudentSearch}
                />
            </View>
            {filteredStudents.map((student) => {
                const studentStatus = normalizeStudentStatus(student.status);
                return (
                    <View key={student.id} style={styles.studentCard}>
                        <View style={styles.studentInfo}>
                            <View style={styles.studentAvatar}>
                                <Text style={styles.avatarText}>{(student.fullName || "?").charAt(0)}</Text>
                            </View>
                            <View>
                                <Text style={styles.studentName}>{student.fullName}</Text>
                                <Text style={styles.studentEmail}>{student.email}</Text>
                            </View>
                        </View>
                        <View style={styles.studentBalanceContainer}>
                            <Text style={styles.studentBalance}>{student.balance} tickets</Text>
                            <Text style={[styles.studentStatus, { color: studentStatus.color }]}>{studentStatus.label}</Text>
                        </View>
                    </View>
                );
            })}
            {filteredStudents.length === 0 ? (
                <Text style={styles.emptyText}>Aucun etudiant trouve.</Text>
            ) : null}
        </View>
    );

    const renderTabs = () => (
        <View style={styles.tabContainer}>
            {["Tickets", "Etudiants", "Historique"].map((tab) => (
                <TouchableOpacity
                    key={tab}
                    style={[styles.tabButton, activeTab === tab && styles.activeTabButton]}
                    onPress={() => setActiveTab(tab)}
                >
                    <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{tab}</Text>
                </TouchableOpacity>
            ))}
        </View>
    );

    const renderHistoryTab = () => (
        <View>
            {history.map((item) => (
                <View key={item.id} style={styles.historyCard}>
                    <View style={styles.historyIconContainer}>
                        <Ionicons
                            name={item.type === "Achat" ? "cart-outline" : "restaurant-outline"}
                            size={20}
                            color={item.type === "Achat" ? "#4CAF50" : "#FFA000"}
                        />
                    </View>
                    <View style={{ flex: 1, paddingHorizontal: 10 }}>
                        <Text style={styles.historyUser}>{item.user}</Text>
                        <Text style={styles.historyDetail}>{item.detail} • {formatHistoryDate(item.date)}</Text>
                    </View>
                    <Text style={[styles.historyAmount, { color: item.type === "Achat" ? "#4CAF50" : "#FFA000" }]}>{item.amount}</Text>
                </View>
            ))}
            {history.length === 0 ? (
                <Text style={styles.emptyText}>Aucun historique disponible.</Text>
            ) : null}
        </View>
    );

    // Modal Component
    const renderPackModal = () => (
        <Modal
            animationType="slide"
            transparent={true}
            visible={modalVisible}
            onRequestClose={() => setModalVisible(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>{isEditing ? "Modifier Pack" : "Nouveau Pack"}</Text>
                        <TouchableOpacity onPress={() => setModalVisible(false)}>
                            <Ionicons name="close" size={24} color={Colors.text} />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.label}>Nom du Pack</Text>
                    <TextInput
                        style={styles.input}
                        value={currentPack.name}
                        onChangeText={(text) => setCurrentPack({ ...currentPack, name: text })}
                        placeholder="Ex: Pack Semaine"
                    />

                    <Text style={styles.label}>Nombre de Tickets</Text>
                    <TextInput
                        style={styles.input}
                        value={currentPack.tickets}
                        onChangeText={(text) => setCurrentPack({ ...currentPack, tickets: text })}
                        placeholder="Ex: 10"
                        keyboardType="numeric"
                    />

                    <Text style={styles.label}>Prix (DT)</Text>
                    <TextInput
                        style={styles.input}
                        value={currentPack.price}
                        onChangeText={(text) => setCurrentPack({ ...currentPack, price: text })}
                        placeholder="Ex: 15 DT"
                        keyboardType="numeric"
                    />

                    <Text style={styles.label}>Description</Text>
                    <TextInput
                        style={[styles.input, { height: 80 }]}
                        value={currentPack.description}
                        onChangeText={(text) => setCurrentPack({ ...currentPack, description: text })}
                        placeholder="Petite description du pack"
                        multiline
                    />

                    <TouchableOpacity style={styles.saveBtn} onPress={handleSavePack}>
                        <Text style={styles.saveBtnText}>{isEditing ? "Mettre à jour" : "Créer le Pack"}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor={Colors.primary} />
            {renderHeader()}
            {renderTabs()}

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {activeTab === "Tickets" && renderTicketsTab()}
                {activeTab === "Etudiants" && renderStudentsTab()}
                {activeTab === "Historique" && renderHistoryTab()}
            </ScrollView>

            {renderPackModal()}
            <BottomTabs />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.primary,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingTop: 15,
        paddingBottom: 20,
    },
    backButton: {
        padding: 5,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: "bold",
        color: Colors.text,
    },
    iconBtn: {
        padding: 5,
    },
    tabContainer: {
        flexDirection: "row",
        paddingHorizontal: 20,
        marginBottom: 20,
        gap: 15,
    },
    tabButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: "transparent",
    },
    activeTabButton: {
        backgroundColor: "#d9b99b",
    },
    tabText: {
        fontSize: 14,
        fontWeight: "600",
        color: Colors.text,
        opacity: 0.6,
    },
    activeTabText: {
        color: Colors.primary,
        opacity: 1,
    },
    content: {
        paddingHorizontal: 20,
        paddingBottom: 120,
    },
    statsRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 30,
        gap: 10,
    },
    statCard: {
        flex: 1,
        backgroundColor: Colors.card,
        borderRadius: 15,
        padding: 15,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    statValue: {
        fontSize: 20,
        fontWeight: "bold",
        color: Colors.text,
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 12,
        color: Colors.text,
        opacity: 0.7,
    },
    sectionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 15,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: Colors.text,
    },
    addPackBtn: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: Colors.text,
        paddingVertical: 8,
        paddingHorizontal: 15,
        borderRadius: 20,
        gap: 5,
    },
    addPackText: {
        color: "#fff",
        fontSize: 12,
        fontWeight: "600",
    },
    packCard: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: Colors.card,
        borderRadius: 20,
        padding: 15,
        marginBottom: 15,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 3,
    },
    packInfo: {
        flexDirection: "row",
        alignItems: "center",
        gap: 15,
    },
    packIcon: {
        width: 45,
        height: 45,
        borderRadius: 22.5,
        backgroundColor: "#d9b99b",
        justifyContent: "center",
        alignItems: "center",
    },
    packName: {
        fontSize: 16,
        fontWeight: "700",
        color: Colors.text,
    },
    packDetail: {
        fontSize: 12,
        color: Colors.text,
        opacity: 0.7,
    },
    packDescription: {
        fontSize: 12,
        color: Colors.text,
        opacity: 0.8,
        marginTop: 2,
        maxWidth: 220,
    },
    packActions: {
        flexDirection: "row",
        gap: 10,
    },
    actionBtn: {
        padding: 8,
    },
    // Student Styles
    searchContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: Colors.card,
        borderRadius: 15,
        paddingHorizontal: 15,
        marginBottom: 20,
        height: 45,
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        color: Colors.text,
    },
    studentCard: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: "#fff", // White for clean list look against nude bg
        padding: 15,
        borderRadius: 15,
        marginBottom: 10,
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
    },
    studentInfo: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    studentAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#e6d8c3",
        justifyContent: "center",
        alignItems: "center",
    },
    avatarText: {
        color: Colors.text,
        fontWeight: "bold",
        fontSize: 16,
    },
    studentName: {
        fontSize: 16,
        fontWeight: "600",
        color: Colors.text,
    },
    studentEmail: {
        fontSize: 12,
        color: "#888",
    },
    studentBalanceContainer: {
        alignItems: "flex-end",
    },
    studentBalance: {
        fontSize: 16,
        fontWeight: "bold",
        color: Colors.text,
    },
    studentStatus: {
        fontSize: 10,
        marginTop: 2,
    },
    // History Styles
    historyCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#fff",
        padding: 15,
        borderRadius: 15,
        marginBottom: 10,
        borderLeftWidth: 4,
        borderLeftColor: "#e6d8c3", // Default border color
    },
    historyIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "#f5f5f5",
        justifyContent: "center",
        alignItems: "center",
    },
    historyUser: {
        fontSize: 14,
        fontWeight: "bold",
        color: Colors.text,
    },
    historyDetail: {
        fontSize: 12,
        color: "#888",
        marginTop: 2,
    },
    historyAmount: {
        fontWeight: "bold",
        fontSize: 14,
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    modalContent: {
        width: "100%",
        backgroundColor: "#fff",
        borderRadius: 20,
        padding: 20,
        elevation: 10,
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: "bold",
        color: Colors.text,
    },
    label: {
        fontSize: 14,
        fontWeight: "600",
        color: Colors.text,
        marginBottom: 8,
        marginTop: 10,
    },
    input: {
        backgroundColor: "#f5f5f5",
        borderRadius: 10,
        padding: 12,
        fontSize: 16,
        color: Colors.text,
    },
    saveBtn: {
        backgroundColor: Colors.text,
        borderRadius: 15,
        paddingVertical: 15,
        alignItems: "center",
        marginTop: 25,
    },
    saveBtnText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "bold",
    },
    emptyText: {
        textAlign: "center",
        color: Colors.text,
        opacity: 0.6,
        marginTop: 20,
    },
    centerContent: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    }
});
