import { create } from 'zustand';
import type { FileSystemItem } from '../types';

interface FileSystemState {
    items: Record<string, FileSystemItem>;
    rootIds: string[];
    selectedId: string | null;
    activeFileIds: string[]; // Files currently being viewed in sequence viewer
    expandedIds: Set<string>;

    // Actions
    createFolder: (name: string, parentId?: string) => void;
    createFile: (name: string, content: string, parentId?: string) => void;
    selectItem: (id: string | null) => void;
    setActiveFiles: (ids: string[]) => void;
    toggleActiveFile: (id: string) => void;
    toggleFolder: (id: string) => void;
    deleteItem: (id: string) => void;
    updateFileContent: (id: string, content: string) => void;
    importItems: (newItems: Record<string, FileSystemItem>) => void;
}

const initialItems: Record<string, FileSystemItem> = {
    'root-1': { id: 'root-1', name: 'My Project', type: 'folder', parentId: null, children: ['file-1', 'file-2'] },
    'file-1': { id: 'file-1', name: 'pUC19.gb', type: 'file', parentId: 'root-1', content: 'LOCUS       pUC19...' },
    'file-2': {
        id: 'file-2',
        name: 'addgene-plasmid.gbk',
        type: 'file',
        parentId: 'root-1',
        content: `LOCUS       sequence-394118-        5188 bp    DNA     circular SYN 14-APR-2025
DEFINITION  Eukaryotic expression vector.
ACCESSION   .
VERSION     .
KEYWORDS    .
SOURCE      synthetic DNA construct
  ORGANISM  synthetic DNA construct
REFERENCE   1  (bases 1 to 5188)
  TITLE     Eukaryotic expression plasmid with a puromycin selection marker
  JOURNAL   Unpublished
REFERENCE   2  (bases 1 to 5188)
  AUTHORS   .
  TITLE     Direct Submission
  JOURNAL   Exported Apr 14, 2025 from SnapGene Server 8.0.1
            https://www.snapgene.com
COMMENT     SGRef: number: 1; type: "Journal Article"; journalName: 
            "Unpublished"
COMMENT     Sequence Label: pcDNA3.1-(-)-Pur
FEATURES             Location/Qualifiers
     source          1..5188
                     /mol_type="other DNA"
                     /organism="synthetic DNA construct"
     polyA_signal    130..251
                     /label=SV40 poly(A) signal
                     /note="SV40 polyadenylation signal"
     primer_bind     complement(167..186)
                     /label=SV40pA-R
                     /note="SV40 polyA, reverse primer"
     primer_bind     221..240
                     /label=EBV-rev
                     /note="SV40 polyA terminator, reverse primer"
     primer_bind     complement(300..316)
                     /label=M13 rev
                     /note="common sequencing primer, one of multiple similar 
                     variants"
     primer_bind     complement(300..316)
                     /label=M13 Reverse
                     /note="In lacZ gene. Also called M13-rev"
     primer_bind     complement(313..335)
                     /label=M13/pUC Reverse
                     /note="In lacZ gene"
     protein_bind    324..340
                     /label=lac operator
                     /bound_moiety="lac repressor encoded by lacI"
                     /note="The lac repressor binds to the lac operator to 
                     inhibit transcription in E. coli. This inhibition can be 
                     relieved by adding lactose or 
                     isopropyl-beta-D-thiogalactopyranoside (IPTG)."
     promoter        complement(join(348..354,355..372,373..378))
                     /label=lac promoter
                     /note="promoter for the E. coli lac operon"
     protein_bind    393..414
                     /label=CAP binding site
                     /bound_moiety="E. coli catabolite activator protein"
                     /note="CAP binding activates transcription in the presence 
                     of cAMP."
     primer_bind     complement(531..548)
                     /label=L4440
                     /note="L4440 vector, forward primer"
     rep_origin      complement(702..1290)
                     /direction=LEFT
                     /label=ori
                     /note="high-copy-number ColE1/pMB1/pBR322/pUC origin of 
                     replication"
     primer_bind     complement(782..801)
                     /label=pBR322ori-F
                     /note="pBR322 origin, forward primer"
     CDS             complement(join(1461..2252,2253..2321))
                     /codon_start=1
                     /gene="bla"
                     /product="beta-lactamase"
                     /label=AmpR
                     /note="confers resistance to ampicillin, carbenicillin, and
                     related antibiotics"
                     /translation="MSIQHFRVALIPFFAAFCLPVFAHPETLVKVKDAEDQLGARVGYI
                     ELDLNSGKILESFRPEERFPMMSTFKVLLCGAVLSRIDAGQEQLGRRIHYSQNDLVEYS
                     PVTEKHLTDGMTVRELCSAAITMSDNTAANLLLTTIGGPKELTAFLHNMGDHVTRLDRW
                     EPELNEAIPNDERDTTMPVAMATTLRKLLTGELLTLASRQQLIDWMEADKVAGPLLRSA
                     LPAGWFIADKSGAGERGSRGIIAALGPDGKPSRIVVIYTTGSQATMDERNRQIAEIGAS
                     LIKHW"
     primer_bind     2084..2103
                     /label=Amp-R
                     /note="Ampicillin resistance gene, reverse primer"
     promoter        complement(2322..2426)
                     /gene="bla"
                     /label=AmpR promoter
     primer_bind     complement(2501..2520)
                     /label=pRS-marker
                     /note="pRS vectors, use to sequence yeast selectable 
                     marker"
     enhancer        2692..3071
                     /label=CMV enhancer
                     /note="human cytomegalovirus immediate early enhancer"
     promoter        3072..3275
                     /label=CMV promoter
                     /note="human cytomegalovirus (CMV) immediate early 
                     promoter"
     primer_bind     3226..3246
                     /label=CMV-F
                     /note="Human CMV immediate early promoter, forward primer"
     primer_bind     3320..3339
                     /label=T7
                     /note="T7 promoter, forward primer"
     promoter        3320..3338
                     /label=T7 promoter
                     /note="promoter for bacteriophage T7 RNA polymerase"
     primer_bind     complement(3478..3495)
                     /label=BGH-rev
                     /note="Bovine growth hormone terminator, reverse primer. 
                     Also called BGH reverse"
     polyA_signal    3484..3708
                     /label=bGH poly(A) signal
                     /note="bovine growth hormone polyadenylation signal"
     rep_origin      3754..4182
                     /direction=RIGHT
                     /label=f1 ori
                     /note="f1 bacteriophage origin of replication; arrow 
                     indicates direction of (+) strand synthesis"
     primer_bind     complement(3841..3860)
                     /label=F1ori-R
                     /note="F1 origin, reverse primer"
     primer_bind     4051..4072
                     /label=F1ori-F
                     /note="F1 origin, forward primer"
     primer_bind     complement(4191..4211)
                     /label=pBABE 3'
                     /note="SV40 enhancer, reverse primer for pBABE vectors"
     promoter        4196..4525
                     /label=SV40 promoter
                     /note="SV40 enhancer and early promoter"
     rep_origin      4376..4511
                     /label=SV40 ori
                     /note="SV40 origin of replication"
     primer_bind     4438..4457
                     /label=SV40pro-F
                     /note="SV40 promoter/origin, forward primer"
     CDS             4581..5180
                     /codon_start=1
                     /product="puromycin N-acetyltransferase"
                     /label=PuroR
                     /note="confers resistance to puromycin"
                     /translation="MTEYKPTVRLATRDDVPRAVRTLAAAFADYPATRHTVDPDRHIER
                     VTELQELFLTRVGLDIGKVWVADDGAAVAVWTTPESVEAGAVFAEIGPRMAELSGSRLA
                     AQQQMEGLLAPHRPKEPAWFLATVGVSPDHQGKGLGSAVVLPGVEAAERAGVPAFLETS
                     APRNLPFYERLGFTVTADVEVPEGPRTWCMTRKPGA"
ORIGIN
        1 cacgtgctac gagatttcga ttccaccgcc gccttctatg aaaggttggg cttcggaatc
       61 gttttccggg acgccggctg gatgatcctc cagcgcgggg atctcatgct ggagttcttc
      121 gcccacccca acttgtttat tgcagcttat aatggttaca aataaagcaa tagcatcaca
      181 aatttcacaa ataaagcatt tttttcactg cattctagtt gtggtttgtc caaactcatc
      241 aatgtatctt atcatgtctg tataccgtcg acctctagct agagcttggc gtaatcatgg
      301 tcatagctgt ttcctgtgtg aaattgttat ccgctcacaa ttccacacaa catacgagcc
      361 ggaagcataa agtgtaaagc ctggggtgcc taatgagtga gctaactcac attaattgcg
      421 ttgcgctcac tgcccgcttt ccagtcggga aacctgtcgt gccagctgca ttaatgaatc
      481 ggccaacgcg cggggagagg cggtttgcgt attgggcgct cttccgcttc ctcgctcact
      541 gactcgctgc gctcggtcgt tcggctgcgg cgagcggtat cagctcactc aaaggcggta
      601 atacggttat ccacagaatc aggggataac gcaggaaaga acatgtgagc aaaaggccag
      661 caaaaggcca ggaaccgtaa aaaggccgcg ttgctggcgt ttttccatag gctccgcccc
      721 cctgacgagc atcacaaaaa tcgacgctca agtcagaggt ggcgaaaccc gacaggacta
      781 taaagatacc aggcgtttcc ccctggaagc tccctcgtgc gctctcctgt tccgaccctg
      841 ccgcttaccg gatacctgtc cgcctttctc ccttcgggaa gcgtggcgct ttctcatagc
      901 tcacgctgta ggtatctcag ttcggtgtag gtcgttcgct ccaagctggg ctgtgtgcac
      961 gaaccccccg ttcagcccga ccgctgcgcc ttatccggta actatcgtct tgagtccaac
     1021 ccggtaagac acgacttatc gccactggca gcagccactg gtaacaggat tagcagagcg
     1081 aggtatgtag gcggtgctac agagttcttg aagtggtggc ctaactacgg ctacactaga
     1141 agaacagtat ttggtatctg cgctctgctg aagccagtta ccttcggaaa aagagttggt
     1201 agctcttgat ccggcaaaca aaccaccgct ggtagcggtg gtttttttgt ttgcaagcag
     1261 cagattacgc gcagaaaaaa aggatctcaa gaagatcctt tgatcttttc tacggggtct
     1321 gacgctcagt ggaacgaaaa ctcacgttaa gggattttgg tcatgagatt atcaaaaagg
     1381 atcttcacct agatcctttt aaattaaaaa tgaagtttta aatcaatcta aagtatatat
     1441 gagtaaactt ggtctgacag ttaccaatgc ttaatcagtg aggcacctat ctcagcgatc
     1501 tgtctatttc gttcatccat agttgcctga ctccccgtcg tgtagataac tacgatacgg
     1561 gagggcttac catctggccc cagtgctgca atgataccgc gagacccacg ctcaccggct
     1621 ccagatttat cagcaataaa ccagccagcc ggaagggccg agcgcagaag tggtcctgca
     1681 actttatccg cctccatcca gtctattaat tgttgccggg aagctagagt aagtagttcg
     1741 ccagttaata gtttgcgcaa cgttgttgcc attgctacag gcatcgtggt gtcacgctcg
     1801 tcgtttggta tggcttcatt cagctccggt tcccaacgat caaggcgagt tacatgatcc
     1861 cccatgttgt gcaaaaaagc ggttagctcc ttcggtcctc cgatcgttgt cagaagtaag
     1921 ttggccgcag tgttatcact catggttatg gcagcactgc ataattctct tactgtcatg
     1981 ccatccgtaa gatgcttttc tgtgactggt gagtactcaa ccaagtcatt ctgagaatag
     2041 tgtatgcggc gaccgagttg ctcttgcccg gcgtcaatac gggataatac cgcgccacat
     2101 agcagaactt taaaagtgct catcattgga aaacgttctt cggggcgaaa actctcaagg
     2161 atcttaccgc tgttgagatc cagttcgatg taacccactc gtgcacccaa ctgatcttca
     2221 gcatctttta ctttcaccag cgtttctggg tgagcaaaaa caggaaggca aaatgccgca
     2281 aaaaagggaa taagggcgac acggaaatgt tgaatactca tactcttcct ttttcaatat
     2341 tattgaagca tttatcaggg ttattgtctc atgagcggat acatatttga atgtatttag
     2401 aaaaataaac aaataggggt tccgcgcaca tttccccgaa aagtgccacc tgacgtcgac
     2461 ggatcgggag atctcccgat cccctatggt gcactctcag tacaatctgc tctgatgccg
     2521 catagttaag ccagtatctg ctccctgctt gtgtgttgga ggtcgctgag tagtgcgcga
     2581 gcaaaattta agctacaaca aggcaaggct tgaccgacaa ttgcatgaag aatctgctta
     2641 gggttaggcg ttttgcgctg cttcgcgatg tacgggccag atatacgcgt tgacattgat
     2701 tattgactag ttattaatag taatcaatta cggggtcatt agttcatagc ccatatatgg
     2761 agttccgcgt tacataactt acggtaaatg gcccgcctgg ctgaccgccc aacgaccccc
     2821 gcccattgac gtcaataatg acgtatgttc ccatagtaac gccaataggg actttccatt
     2881 gacgtcaatg ggtggagtat ttacggtaaa ctgcccactt ggcagtacat caagtgtatc
     2941 atatgccaag tacgccccct attgacgtca atgacggtaa atggcccgcc tggcattatg
     3001 cccagtacat gaccttatgg gactttccta cttggcagta catctacgta ttagtcatcg
     3061 ctattaccat mgtgatgcgg ttttggcagt acatcaatgg gcgtggatag cggtttgact
     3121 cacggggatt tccaagtctc caccccattg acgtcaatgg gagtttgttt tggcaccaaa
     3181 atcaacggga ctttccaaaa tgtcgtaaca actccgcccc attgacgcaa atgggcggta
     3241 ggcgtgtacg gtgggaggtc tatataagca gagctctctg gctaactaga gaacccactg
     3301 cttactggct tatcgaaatt aatacgactc actataggga gacccaagct ggctagcgtt
     3361 taaacgggcc ctctagactc gagcggccgc cactgtgctg gatatctgca gaattccacc
     3421 acactggact agtggatccg agctcggtac caagcttaag tttaaaccgc tgatcagcct
     3481 cgactgtgcc ttctagttgc cagccatctg ttgtttgccc ctcccccgtg ccttccttga
     3541 ccctggaagg tgccactccc actgtccttt cctaataaaa tgaggaaatt gcatcgcatt
     3601 gtctgagtag gtgtcattct attctggggg gtggggtggg gcaggacagc aagggggagg
     3661 attgggaaga caatagcagg catgctgggg atgcggtggg ctctatggct tctgaggcgg
     3721 aaagaaccag ctggggctct agggggtatc cccacgcgcc ctgtagcggc gcattaagcg
     3781 cggcgggtgt ggtggttacg cgcagcgtga ccgctacact tgccagcgcc ctagcgcccg
     3841 ctcctttcgc tttcttccct tcctttctcg ccacgttcgc cggctttccc cgtcaagctc
     3901 taaatcgggg gctcccttta gggttccgat ttagtgcttt acggcacctc gaccccaaaa
     3961 aacttgatta gggtgatggt tcacgtagtg ggccatcgcc ctgatagacg gtttttcgcc
     4021 ctttgacgtt ggagtccacg ttctttaata gtggactctt gttccaaact ggaacaacac
     4081 tcaaccctat ctcggtctat tcttttgatt tataagggat tttgccgatt tcggcctatt
     4141 ggttaaaaaa tgagctgatt taacaaaaat ttaacgcgaa ttaattctgt ggaatgtgtg
     4201 tcagttaggg tgtggaaagt ccccaggctc cccagcaggc agaagtatgc aaagcatgca
     4261 tctcaattag tcagcaacca ggtgtggaaa gtccccaggc tccccagcag gcagaagtat
     4281 gcaaagcatg catctcaatt agtcagcaac catagtcccg cccctaactc cgcccatccc
     4341 gcccctaact ccgcccagtt ccgcccattc tccgccccat ggctgactaa ttttttttat
     4401 ttatgcagag gccgaggccg cctctgcctc tgagctattc cagaagtagt gaggaggctt
     4461 ttttggaggc ctaggctttt gcaaaaagct cccgggagct tgtatatcca ttttcggatc
     4521 tgatcagcac gtgcctgagg atgaccgagt acaagcctac cgtgcgcctg gccactcgcg
     4581 atgatgtgcc ccgcgccgtc cgcactctgg ccgccgcttt cgccgactac cccgctaccc
     4641 ggcacaccgt ggaccccgac cggcacatcg agcgtgtgac agagttgcag gagctgttcc
     4701 tgacccgcgt cgggctggac atcggcaagg tgtgggtagc cgacgacggc gcggccgtgg
     4761 ccgtgtggac tacccccgag agcgttgagg ccggcgccgt gttcgccgag atcggccccc
     4821 gaatggccga gctgagcggc agccgcctgg ccgcccagca gcaaatggag ggcctgcttg
     4881 ccccccatcg tcccaaggag cctgcctggt ttctggccac tgtaggagtg agccccgacc
     4941 accagggcaa gggcttgggc agcgccgtcg tgttgcccgg cgtagaggcc gccgaacgcg
     5001 ccggtgtgcc cgcctttctc gaaacaagcg caccaagaaa ccttccattc tacgagcgcc
     5061 tgggcttcac cgtgaccgcc gatgtcgagg tgcccgaggg acctaggacc tggtgtatga
     5121 cacgaaaacc tggcgcctaa ggcgcgcc
//`
    },
};

export const useFileSystemStore = create<FileSystemState>((set) => ({
    items: initialItems,
    rootIds: ['root-1'],
    selectedId: null,
    activeFileIds: [],
    expandedIds: new Set(['root-1']),

    createFolder: (name, parentId) => {
        const id = crypto.randomUUID();
        const newItem: FileSystemItem = { id, name, type: 'folder', parentId: parentId || null, children: [] };

        set((state) => {
            const newItems = { ...state.items, [id]: newItem };
            if (parentId && newItems[parentId]) {
                newItems[parentId] = {
                    ...newItems[parentId],
                    children: [...(newItems[parentId].children || []), id],
                };
            } else if (!parentId) {
                return { items: newItems, rootIds: [...state.rootIds, id] };
            }
            return { items: newItems };
        });
    },

    createFile: (name, content, parentId) => {
        const id = crypto.randomUUID();
        const newItem: FileSystemItem = { id, name, type: 'file', parentId: parentId || null, content };

        set((state) => {
            const newItems = { ...state.items, [id]: newItem };
            if (parentId && newItems[parentId]) {
                newItems[parentId] = {
                    ...newItems[parentId],
                    children: [...(newItems[parentId].children || []), id],
                };
            }
            return { items: newItems };
        });
    },

    updateFileContent: (id, content) => set((state) => {
        const item = state.items[id];
        if (!item || item.type !== 'file') return {};

        return {
            items: {
                ...state.items,
                [id]: { ...item, content }
            }
        };
    }),

    selectItem: (id) => set({ selectedId: id }),

    setActiveFiles: (ids) => set({ activeFileIds: ids }),

    toggleActiveFile: (id) => set((state) => {
        const currentIds = state.activeFileIds;
        if (currentIds.includes(id)) {
            return { activeFileIds: currentIds.filter(fileId => fileId !== id) };
        } else {
            return { activeFileIds: [...currentIds, id] };
        }
    }),

    toggleFolder: (id) => set((state) => {
        const newExpanded = new Set(state.expandedIds);
        if (newExpanded.has(id)) {
            newExpanded.delete(id);
        } else {
            newExpanded.add(id);
        }
        return { expandedIds: newExpanded };
    }),

    deleteItem: (id) => set((state) => {
        const newItems = { ...state.items };
        const itemToDelete = newItems[id];

        if (!itemToDelete) return {};

        // Helper to collect all descendant IDs
        const getDescendantIds = (itemId: string): string[] => {
            const item = newItems[itemId];
            if (!item || !item.children) return [];

            let ids: string[] = [];
            for (const childId of item.children) {
                ids.push(childId);
                ids = [...ids, ...getDescendantIds(childId)];
            }
            return ids;
        };

        const idsToDelete = [id, ...getDescendantIds(id)];

        // Delete all collected items
        idsToDelete.forEach(deleteId => {
            delete newItems[deleteId];
        });

        // Remove from parent's children
        if (itemToDelete.parentId && newItems[itemToDelete.parentId]) {
            newItems[itemToDelete.parentId] = {
                ...newItems[itemToDelete.parentId],
                children: newItems[itemToDelete.parentId].children?.filter((childId) => childId !== id),
            };
        }

        // Remove from rootIds if it's a root item
        let newRootIds = state.rootIds;
        if (!itemToDelete.parentId) {
            newRootIds = state.rootIds.filter(rootId => rootId !== id);
        }

        // Check if selected item was deleted
        const newSelectedId = idsToDelete.includes(state.selectedId || '') ? null : state.selectedId;

        return { items: newItems, rootIds: newRootIds, selectedId: newSelectedId };
    }),

    importItems: (newItemsMap: Record<string, FileSystemItem>) => set((state) => {
        const updatedItems = { ...state.items, ...newItemsMap };

        // Update parent references for new root items if any (though usually imports will be self-contained or added to root)
        // If we are just merging a flat map of items where parentIds are already set correctly relative to each other or null (for root)

        // We need to ensure rootIds is updated if any new items are at the root level (parentId === null)
        const newRootIds = [...state.rootIds];
        Object.values(newItemsMap).forEach((item: FileSystemItem) => {
            if (!item.parentId && !newRootIds.includes(item.id)) {
                newRootIds.push(item.id);
            }
            // Also update parent's children array if the parent exists in state or in newItemsMap
            if (item.parentId) {
                if (updatedItems[item.parentId]) {
                    const parent = updatedItems[item.parentId];
                    if (!parent.children?.includes(item.id)) {
                        updatedItems[item.parentId] = {
                            ...parent,
                            children: [...(parent.children || []), item.id]
                        };
                    }
                }
            }
        });

        return { items: updatedItems, rootIds: newRootIds };
    }),
}));
